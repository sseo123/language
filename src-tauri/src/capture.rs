//! Capture sessions: hotkey -> overlay window -> frozen frame -> crop -> OCR.

use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use image::RgbaImage;
use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::helper;

pub const OVERLAY_LABEL: &str = "overlay";
pub const MAIN_LABEL: &str = "main";

#[derive(Debug, Clone, Default, Serialize)]
pub struct Source {
    pub app: String,
    pub title: String,
    pub pid: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub session_id: String,
    /// Logical size of the display the overlay covers.
    pub width: f64,
    pub height: f64,
    pub source: Source,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FramePayload {
    session_id: String,
    path: String,
    source: Source,
}

#[derive(Debug, Clone, Serialize)]
struct ErrorPayload {
    message: String,
}

pub struct Crop {
    pub path: PathBuf,
    pub text: String,
}

pub struct Session {
    pub id: String,
    pub info: SessionInfo,
    pub frame_path: Option<PathBuf>,
    pub frame: Option<Arc<RgbaImage>>,
    pub frame_scale: f64,
    pub frame_error: Option<String>,
    pub crop: Option<Crop>,
    /// The overlay UI has rendered this session; until then the window stays hidden.
    pub ready: bool,
}

/// How long the overlay page may take to pick up a session before it is dropped.
const READY_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Default)]
pub struct CaptureState {
    pub session: Mutex<Option<Session>>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CropResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub text: String,
    pub lines: Vec<helper::OcrLine>,
}

fn now_ms() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0)
}

fn frames_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("frames");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn captures_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("captures");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// ---------------------------------------------------------------------------
// macOS specifics
// ---------------------------------------------------------------------------

fn frontmost_app() -> Source {
    use objc2_app_kit::NSWorkspace;
    let workspace = NSWorkspace::sharedWorkspace();
    let Some(app) = workspace.frontmostApplication() else {
        return Source::default();
    };
    Source {
        app: app.localizedName().map(|s| s.to_string()).unwrap_or_default(),
        title: String::new(),
        pid: Some(app.processIdentifier()),
    }
}

fn activate_pid(pid: i32) {
    use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication};
    if let Some(app) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) {
        #[allow(deprecated)]
        app.activateWithOptions(NSApplicationActivationOptions::ActivateIgnoringOtherApps);
    }
}

/// Raise the overlay above the menu bar and let it join every Space,
/// including full-screen apps. Must run on the main thread.
fn configure_overlay_ns_window(window: &WebviewWindow) {
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior};
    let Ok(ptr) = window.ns_window() else { return };
    let ns: &NSWindow = unsafe { &*(ptr as *const NSWindow) };
    // NSPopUpMenuWindowLevel: above the menu bar and the Dock, below alerts.
    ns.setLevel(101);
    ns.setCollectionBehavior(
        NSWindowCollectionBehavior::CanJoinAllSpaces
            | NSWindowCollectionBehavior::FullScreenAuxiliary
            | NSWindowCollectionBehavior::Stationary
            | NSWindowCollectionBehavior::IgnoresCycle,
    );
    ns.setHasShadow(false);
}

fn ns_window_number(window: &WebviewWindow) -> Option<u32> {
    use objc2_app_kit::NSWindow;
    let ptr = window.ns_window().ok()?;
    let ns: &NSWindow = unsafe { &*(ptr as *const NSWindow) };
    u32::try_from(ns.windowNumber()).ok()
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

pub fn ensure_overlay(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        return Ok(window);
    }
    let window = WebviewWindowBuilder::new(app, OVERLAY_LABEL, WebviewUrl::App("overlay.html".into()))
        .title("Teachya Capture")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .minimizable(false)
        .maximizable(false)
        .closable(false)
        .visible(false)
        .visible_on_all_workspaces(true)
        .accept_first_mouse(true)
        .build()
        .map_err(|e| e.to_string())?;
    let w = window.clone();
    window
        .run_on_main_thread(move || configure_overlay_ns_window(&w))
        .map_err(|e| e.to_string())?;
    Ok(window)
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/// Called from the global hotkey, the tray menu, or the main window.
pub fn start_capture(app: &AppHandle) -> Result<(), String> {
    // Who is in front, before we take focus.
    let source = frontmost_app();

    // Which display is the cursor on?
    let cursor = app.cursor_position().map_err(|e| e.to_string())?;
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors
        .into_iter()
        .find(|m| {
            let p = m.position();
            let s = m.size();
            cursor.x >= p.x as f64
                && cursor.x < (p.x + s.width as i32) as f64
                && cursor.y >= p.y as f64
                && cursor.y < (p.y + s.height as i32) as f64
        })
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or("No display found")?;
    let position = *monitor.position();
    let size = *monitor.size();
    let scale = monitor.scale_factor();
    let logical_point = (cursor.x / scale, cursor.y / scale);

    let overlay = ensure_overlay(app)?;
    overlay
        .set_position(PhysicalPosition::new(position.x, position.y))
        .map_err(|e| e.to_string())?;
    overlay
        .set_size(PhysicalSize::new(size.width, size.height))
        .map_err(|e| e.to_string())?;

    let id = now_ms().to_string();
    let info = SessionInfo {
        session_id: id.clone(),
        width: size.width as f64 / scale,
        height: size.height as f64 / scale,
        source: source.clone(),
    };

    {
        let state = app.state::<CaptureState>();
        let mut guard = state.session.lock().unwrap();
        if let Some(old) = guard.take() {
            if let Some(path) = old.frame_path {
                let _ = std::fs::remove_file(path);
            }
        }
        *guard = Some(Session {
            id: id.clone(),
            info: info.clone(),
            frame_path: None,
            frame: None,
            frame_scale: scale,
            frame_error: None,
            crop: None,
            ready: false,
        });
    }

    // The overlay is a click-swallowing window above everything else, so it is
    // only shown once its page confirms it is drawing this session (`capture_ready`).
    // If the page never loads, the screen is never covered.
    app.emit_to(OVERLAY_LABEL, "capture:start", &info).map_err(|e| e.to_string())?;

    let window_number = ns_window_number(&overlay);
    let handle = app.clone();
    let capture_id = id.clone();
    tauri::async_runtime::spawn(async move {
        capture_frame(handle, capture_id, logical_point, window_number, source.pid).await;
    });

    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(READY_TIMEOUT).await;
        let state = handle.state::<CaptureState>();
        let mut guard = state.session.lock().unwrap();
        if guard.as_ref().is_some_and(|s| s.id == id && !s.ready) {
            eprintln!("Capture overlay did not load in time; cancelling capture");
            if let Some(path) = guard.take().and_then(|s| s.frame_path) {
                let _ = std::fs::remove_file(path);
            }
        }
    });
    Ok(())
}

/// Lets the overlay pick up a session it missed while its page was still loading.
#[tauri::command]
pub fn current_capture(app: AppHandle) -> Option<SessionInfo> {
    let state = app.state::<CaptureState>();
    let guard = state.session.lock().unwrap();
    guard.as_ref().map(|s| s.info.clone())
}

#[tauri::command]
pub fn capture_ready(app: AppHandle, session_id: String) -> Result<(), String> {
    {
        let state = app.state::<CaptureState>();
        let mut guard = state.session.lock().unwrap();
        let session = guard.as_mut().filter(|s| s.id == session_id).ok_or("Capture was cancelled")?;
        session.ready = true;
    }
    let overlay = app.get_webview_window(OVERLAY_LABEL).ok_or("Overlay window is missing")?;
    overlay.show().map_err(|e| e.to_string())?;
    overlay.set_focus().map_err(|e| e.to_string())
}

async fn capture_frame(
    app: AppHandle,
    id: String,
    point: (f64, f64),
    window_number: Option<u32>,
    front_pid: Option<i32>,
) {
    let state = app.state::<CaptureState>();
    let result = async {
        let out = frames_dir(&app)?.join(format!("{id}.png"));
        let cap = helper::capture(&app, point, window_number, front_pid, &out.to_string_lossy()).await?;
        Ok::<_, String>((out, cap))
    }
    .await;

    match result {
        Ok((path, cap)) => {
            let source = {
                let mut guard = state.session.lock().unwrap();
                let Some(session) = guard.as_mut().filter(|s| s.id == id) else { return };
                session.frame_path = Some(path.clone());
                session.frame_scale = cap.scale;
                if !cap.app.is_empty() {
                    session.info.source.app = cap.app.clone();
                }
                session.info.source.title = cap.title.clone();
                session.info.source.clone()
            };
            let _ = app.emit_to(
                OVERLAY_LABEL,
                "capture:frame",
                FramePayload { session_id: id.clone(), path: path.to_string_lossy().into_owned(), source },
            );

            let decode_path = path.clone();
            let decoded = tauri::async_runtime::spawn_blocking(move || image::open(&decode_path).map(|i| i.to_rgba8())).await;
            let mut guard = state.session.lock().unwrap();
            let Some(session) = guard.as_mut().filter(|s| s.id == id) else { return };
            match decoded {
                Ok(Ok(img)) => session.frame = Some(Arc::new(img)),
                Ok(Err(e)) => session.frame_error = Some(format!("Could not read screenshot: {e}")),
                Err(e) => session.frame_error = Some(format!("Could not read screenshot: {e}")),
            }
        }
        Err(message) => {
            {
                let mut guard = state.session.lock().unwrap();
                if let Some(session) = guard.as_mut().filter(|s| s.id == id) {
                    session.frame_error = Some(message.clone());
                }
            }
            let _ = app.emit_to(OVERLAY_LABEL, "capture:error", ErrorPayload { message });
        }
    }
}

#[tauri::command]
pub fn start_capture_cmd(app: AppHandle) -> Result<(), String> {
    start_capture(&app)
}

#[tauri::command]
pub fn end_capture(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = overlay.hide();
    }
    let previous_pid = {
        let state = app.state::<CaptureState>();
        let mut guard = state.session.lock().unwrap();
        guard.take().and_then(|s| {
            if let Some(path) = s.frame_path {
                let _ = std::fs::remove_file(path);
            }
            s.info.source.pid
        })
    };
    let main_visible = app
        .get_webview_window(MAIN_LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);
    if !main_visible {
        if let Some(pid) = previous_pid {
            activate_pid(pid);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn crop_frame(
    app: AppHandle,
    session_id: String,
    rect: Rect,
    langs: Vec<String>,
) -> Result<CropResult, String> {
    let state = app.state::<CaptureState>();

    // The screenshot is taken asynchronously when the overlay appears; wait for it.
    let started = Instant::now();
    let (frame, scale) = loop {
        {
            let guard = state.session.lock().unwrap();
            let session = guard.as_ref().filter(|s| s.id == session_id).ok_or("Capture was cancelled")?;
            if let Some(err) = &session.frame_error {
                return Err(err.clone());
            }
            if let Some(frame) = &session.frame {
                break (frame.clone(), session.frame_scale);
            }
        }
        if started.elapsed() > Duration::from_secs(8) {
            return Err("The screenshot took too long. Try again.".into());
        }
        tokio::time::sleep(Duration::from_millis(25)).await;
    };

    let (fw, fh) = (frame.width() as i64, frame.height() as i64);
    let x = ((rect.x * scale).round() as i64).clamp(0, fw);
    let y = ((rect.y * scale).round() as i64).clamp(0, fh);
    let w = ((rect.w * scale).round() as i64).clamp(0, fw - x);
    let h = ((rect.h * scale).round() as i64).clamp(0, fh - y);
    if w < 2 || h < 2 {
        return Err("Selection is too small".into());
    }

    let path = captures_dir(&app)?.join(format!("{session_id}.png"));
    let save_path = path.clone();
    let (w, h) = (w as u32, h as u32);
    tauri::async_runtime::spawn_blocking(move || {
        let crop = image::imageops::crop_imm(&*frame, x as u32, y as u32, w, h).to_image();
        crop.save(&save_path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())??;

    let ocr = match helper::ocr(&app, &path.to_string_lossy(), &langs).await {
        Ok(ocr) => ocr,
        Err(e) => {
            eprintln!("OCR failed: {e}");
            helper::OcrOutput { text: String::new(), lines: Vec::new() }
        }
    };

    {
        let mut guard = state.session.lock().unwrap();
        if let Some(session) = guard.as_mut().filter(|s| s.id == session_id) {
            session.crop = Some(Crop { path: path.clone(), text: ocr.text.clone() });
        }
    }

    Ok(CropResult {
        path: path.to_string_lossy().into_owned(),
        width: w,
        height: h,
        text: ocr.text,
        lines: ocr.lines,
    })
}

// ---------------------------------------------------------------------------
// Hotkey, permissions, misc
// ---------------------------------------------------------------------------

pub fn register_hotkey(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    shortcuts.unregister_all().map_err(|e| e.to_string())?;
    let parsed: Shortcut = shortcut.parse().map_err(|e| format!("Invalid shortcut: {e:?}"))?;
    shortcuts
        .on_shortcut(parsed, |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(e) = start_capture(app) {
                    eprintln!("start_capture failed: {e}");
                }
            }
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_hotkey(app: AppHandle, shortcut: String) -> Result<(), String> {
    register_hotkey(&app, &shortcut)
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    show_main(&app);
}

#[tauri::command]
pub async fn check_permissions(app: AppHandle) -> Result<helper::Permissions, String> {
    helper::permissions(&app, None).await
}

#[tauri::command]
pub async fn request_permission(app: AppHandle, kind: String) -> Result<helper::Permissions, String> {
    helper::permissions(&app, Some(&kind)).await
}

#[tauri::command]
pub fn open_privacy_settings(pane: String) -> Result<(), String> {
    let anchor = match pane.as_str() {
        "mic" => "Privacy_Microphone",
        _ => "Privacy_ScreenCapture",
    };
    std::process::Command::new("open")
        .arg(format!("x-apple.systempreferences:com.apple.preference.security?{anchor}"))
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
