mod ai;
mod capture;
mod helper;
mod secrets;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, RunEvent, WindowEvent,
};

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Teachya", true, None::<&str>)?;
    let capture = MenuItem::with_id(app, "capture", "Capture Selection", true, Some("Alt+Space"))?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit Teachya"))?;
    let menu = Menu::with_items(app, &[&open, &capture, &PredefinedMenuItem::separator(app)?, &quit])?;

    TrayIconBuilder::with_id("tray")
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("Teachya")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => capture::show_main(app),
            "capture" => {
                if let Err(e) = capture::start_capture(app) {
                    eprintln!("start_capture failed: {e}");
                }
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(capture::CaptureState::default())
        .setup(|app| {
            let handle = app.handle().clone();
            if let Err(e) = capture::register_hotkey(&handle, "Alt+Space") {
                eprintln!("Could not register hotkey: {e}");
            }
            setup_tray(&handle)?;
            // Load the overlay page up front so the first capture does not wait on it.
            if let Err(e) = capture::ensure_overlay(&handle) {
                eprintln!("Could not create capture overlay: {e}");
            }

            // DEV-ONLY: file-driven control for automated testing. Remove before release.
            #[cfg(debug_assertions)]
            {
                let h = handle.clone();
                std::thread::spawn(move || loop {
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    let path = "/tmp/teachya-dev-command.json";
                    let Ok(raw) = std::fs::read_to_string(path) else { continue };
                    let _ = std::fs::remove_file(path);
                    let Ok(cmd) = serde_json::from_str::<serde_json::Value>(&raw) else { continue };
                    if cmd["cmd"] == "capture" {
                        let h2 = h.clone();
                        let _ = h.run_on_main_thread(move || {
                            if let Err(e) = capture::start_capture(&h2) {
                                eprintln!("dev capture failed: {e}");
                            }
                        });
                        if let Some(script) = cmd.get("script").cloned() {
                            std::thread::sleep(std::time::Duration::from_millis(1500));
                            use tauri::Emitter;
                            let _ = h.emit_to(capture::OVERLAY_LABEL, "dev:script", script);
                        }
                    }
                });
            }

            // Closing the main window hides it; Teachya keeps running for the hotkey.
            if let Some(main) = app.get_webview_window(capture::MAIN_LABEL) {
                let window = main.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            capture::start_capture_cmd,
            capture::end_capture,
            capture::current_capture,
            capture::capture_ready,
            capture::crop_frame,
            capture::set_hotkey,
            capture::show_main_window,
            capture::check_permissions,
            capture::request_permission,
            capture::open_privacy_settings,
            ai::explain,
            ai::transcribe,
            ai::test_connection,
            secrets::set_api_key,
            secrets::clear_api_key,
            secrets::has_api_key,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Teachya")
        .run(|app, event| match event {
            // Dock icon click with no visible windows.
            RunEvent::Reopen { .. } => capture::show_main(app),
            // Keep running when every window is hidden; only an explicit Quit exits.
            RunEvent::ExitRequested { api, code, .. } => {
                if code.is_none() {
                    api.prevent_exit();
                }
            }
            _ => {}
        });
}
