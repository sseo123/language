fn main() {
    // Bakes a personal key from the git-ignored ../.env.local into the binary so
    // it works without entering one in Settings. A key saved in Settings wins.
    println!("cargo:rerun-if-changed=../.env.local");
    if let Ok(env) = std::fs::read_to_string("../.env.local") {
        for line in env.lines() {
            if let Some((name, value)) = line.split_once('=') {
                let (name, value) = (name.trim(), value.trim().trim_matches('"'));
                if name == "GEMINI_API_KEY" && !value.is_empty() {
                    println!("cargo:rustc-env=GEMINI_API_KEY={value}");
                }
            }
        }
    }
    tauri_build::build()
}
