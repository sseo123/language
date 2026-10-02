//! Thin wrapper around the Swift sidecar (`native/helper/Helper.swift`).

use serde::Deserialize;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Clone, Deserialize)]
pub struct CaptureOutput {
    pub scale: f64,
    #[serde(default)]
    pub app: String,
    #[serde(default)]
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct OcrLine {
    pub text: String,
    pub confidence: f64,
    /// Normalized [x, y, w, h] with a top-left origin.
    #[serde(rename = "box")]
    pub bbox: [f64; 4],
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct OcrOutput {
    pub text: String,
    pub lines: Vec<OcrLine>,
}

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct Permissions {
    pub screen: bool,
    pub mic: bool,
}

async fn run<T: for<'de> Deserialize<'de>>(app: &AppHandle, args: &[&str]) -> Result<T, String> {
    let cmd = app
        .shell()
        .sidecar("teachya-helper")
        .map_err(|e| format!("Helper not found: {e}"))?
        .args(args);
    let out = cmd.output().await.map_err(|e| format!("Helper failed to start: {e}"))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(if err.is_empty() { "Helper failed".into() } else { err });
    }
    serde_json::from_slice(&out.stdout).map_err(|e| format!("Bad helper output: {e}"))
}

pub async fn capture(
    app: &AppHandle,
    point: (f64, f64),
    exclude_window: Option<u32>,
    front_pid: Option<i32>,
    out: &str,
) -> Result<CaptureOutput, String> {
    let point = format!("{},{}", point.0, point.1);
    let mut args = vec!["capture", "--point", &point, "--out", out];
    let exclude = exclude_window.map(|w| w.to_string());
    if let Some(w) = exclude.as_deref() {
        args.extend(["--exclude-window", w]);
    }
    let pid = front_pid.map(|p| p.to_string());
    if let Some(p) = pid.as_deref() {
        args.extend(["--front-pid", p]);
    }
    run(app, &args).await
}

pub async fn ocr(app: &AppHandle, image: &str, langs: &[String]) -> Result<OcrOutput, String> {
    let langs = if langs.is_empty() { "en-US".to_string() } else { langs.join(",") };
    run(app, &["ocr", "--image", image, "--langs", &langs]).await
}

pub async fn permissions(app: &AppHandle, request: Option<&str>) -> Result<Permissions, String> {
    match request {
        Some(kind) => run(app, &["permissions", "--request", kind]).await,
        None => run(app, &["permissions"]).await,
    }
}
