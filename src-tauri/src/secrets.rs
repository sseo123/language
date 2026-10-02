//! API key storage in the macOS Keychain. Only Rust ever reads the key.

const SERVICE: &str = "com.teachya.app";
const ACCOUNT: &str = "model-api-key";

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
}

pub fn get_api_key() -> Result<Option<String>, String> {
    let built_in = option_env!("GEMINI_API_KEY").map(str::to_string);
    match entry()?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(built_in),
        Err(e) => built_in.map(Some).ok_or_else(|| e.to_string()),
    }
}

#[tauri::command]
pub fn set_api_key(key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return clear_api_key();
    }
    entry()?.set_password(key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_api_key() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn has_api_key() -> Result<bool, String> {
    Ok(get_api_key()?.is_some())
}
