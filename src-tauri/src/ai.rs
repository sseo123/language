//! Cloud model calls. The API key never leaves Rust.

use std::{sync::OnceLock, time::Duration};

use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Manager};

use crate::{capture::CaptureState, secrets};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelConfig {
    pub base_url: String,
    pub model: String,
    #[serde(default)]
    pub transcribe_model: String,
    #[serde(default = "default_true")]
    pub send_screenshot: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize)]
pub struct ConnectionTest {
    pub ok: bool,
    pub message: String,
}

fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            // Gemma 4 thinks before answering and can take over a minute.
            .timeout(Duration::from_secs(180))
            .build()
            .expect("http client")
    })
}

fn language_name(code: &str) -> &'static str {
    match code {
        "ko" => "Korean",
        "ja" => "Japanese",
        "es" => "Spanish",
        "zh" => "Chinese",
        "fr" => "French",
        _ => "English",
    }
}

/// Gemma's API fails on large screenshots, so anything over 768px on a side is scaled down.
fn shrink_png(bytes: &[u8]) -> Vec<u8> {
    const MAX: u32 = 768;
    let Ok(img) = image::load_from_memory(bytes) else {
        return bytes.to_vec();
    };
    if img.width() <= MAX && img.height() <= MAX {
        return bytes.to_vec();
    }
    let img = img.resize(MAX, MAX, image::imageops::FilterType::Triangle);
    let mut out = Vec::new();
    match img.write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png) {
        Ok(()) => out,
        Err(_) => bytes.to_vec(),
    }
}

fn api_key() -> Result<String, String> {
    secrets::get_api_key()?.ok_or_else(|| "NO_API_KEY".to_string())
}

const GOOGLE_BASE: &str = "https://generativelanguage.googleapis.com/v1beta";

/// Gemma is only served through Google's native API, not its OpenAI-compatible
/// endpoint, so Google-hosted models always take the native route.
fn is_google(config: &ModelConfig) -> bool {
    let model = config.model.trim().to_lowercase();
    config.base_url.contains("generativelanguage.googleapis.com") || model.starts_with("gemma") || model.starts_with("gemini")
}

fn endpoint(config: &ModelConfig, path: &str) -> String {
    let base = config.base_url.trim().trim_end_matches('/');
    let base = if base.is_empty() { "https://api.openai.com/v1" } else { base };
    format!("{base}/{path}")
}

struct Prompt<'a> {
    system: &'a str,
    user: &'a str,
    image_png: Option<Vec<u8>>,
    audio: Option<(Vec<u8>, &'a str)>,
    json: bool,
    temperature: f32,
    max_tokens: Option<u32>,
}

async fn complete(config: &ModelConfig, model: &str, prompt: Prompt<'_>) -> Result<String, String> {
    if is_google(config) {
        return google_generate(model, prompt).await;
    }
    let b64 = |bytes: &[u8]| base64::engine::general_purpose::STANDARD.encode(bytes);
    let mut user_content = vec![json!({ "type": "text", "text": prompt.user })];
    if let Some(png) = &prompt.image_png {
        user_content.push(json!({
            "type": "image_url",
            "image_url": { "url": format!("data:image/png;base64,{}", b64(png)), "detail": "high" }
        }));
    }
    let mut messages = Vec::new();
    if !prompt.system.is_empty() {
        messages.push(json!({ "role": "system", "content": prompt.system }));
    }
    messages.push(json!({ "role": "user", "content": user_content }));
    let mut body = json!({ "model": model, "temperature": prompt.temperature, "messages": messages });
    if prompt.json {
        body["response_format"] = json!({ "type": "json_object" });
    }
    if let Some(n) = prompt.max_tokens {
        body["max_tokens"] = json!(n);
    }
    chat(config, body).await
}

async fn google_generate(model: &str, mut prompt: Prompt<'_>) -> Result<String, String> {
    let key = api_key()?;
    let b64 = |bytes: &[u8]| base64::engine::general_purpose::STANDARD.encode(bytes);
    let model = model.trim().trim_start_matches("models/");
    let gemma = model.to_lowercase().starts_with("gemma");
    // Gemma on this API returns 500 intermittently for requests that succeed on a retry.
    let mut attempt = 0u8;

    loop {
        attempt += 1;
        // Gemma rejects system instructions and JSON mode, so the instructions
        // travel inside the user turn and the JSON is parsed leniently.
        let mut parts = Vec::new();
        let text = if gemma && !prompt.system.is_empty() {
            format!("{}\n\n{}", prompt.system, prompt.user)
        } else {
            prompt.user.to_string()
        };
        parts.push(json!({ "text": text }));
        let image = prompt.image_png.as_ref().map(|png| shrink_png(png));
        if let Some(png) = &image {
            parts.push(json!({ "inlineData": { "mimeType": "image/png", "data": b64(png) } }));
        }
        if let Some((audio, mime)) = &prompt.audio {
            let mime = mime.split(';').next().unwrap_or(mime);
            parts.push(json!({ "inlineData": { "mimeType": mime, "data": b64(audio) } }));
        }

        let mut generation = json!({ "temperature": prompt.temperature });
        if let Some(n) = prompt.max_tokens {
            generation["maxOutputTokens"] = json!(n);
        }
        if prompt.json && !gemma {
            generation["responseMimeType"] = json!("application/json");
        }
        let mut body = json!({
            "contents": [{ "role": "user", "parts": parts }],
            "generationConfig": generation,
        });
        if !gemma && !prompt.system.is_empty() {
            body["systemInstruction"] = json!({ "parts": [{ "text": prompt.system }] });
        }

        let res = client()
            .post(format!("{GOOGLE_BASE}/models/{model}:generateContent"))
            .header("x-goog-api-key", &key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Network error: {e}"))?;
        let status = res.status();
        let text = res.text().await.map_err(|e| e.to_string())?;
        let parsed: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
        if !status.is_success() {
            let message = parsed["error"]["message"]
                .as_str()
                .map(str::to_string)
                .unwrap_or_else(|| text.chars().take(300).collect());
            if status.as_u16() == 500 && attempt < 3 {
                tokio::time::sleep(Duration::from_millis(600)).await;
                continue;
            }
            // A screenshot is the usual trigger. One last try with the recognized text only.
            if status.as_u16() == 500 && prompt.image_png.is_some() {
                prompt.image_png = None;
                attempt = 0;
                continue;
            }
            return Err(match status.as_u16() {
                400 if message.contains("API key") => "The API key was rejected. Check it in Settings.".to_string(),
                401 | 403 => "The API key was rejected. Check it in Settings.".to_string(),
                404 => format!("Model not found: {message}"),
                429 => format!("Rate limited: {message}"),
                code => format!("Model error ({code}): {message}"),
            });
        }
        // Thinking models return their reasoning as separate parts flagged `thought`.
        let out: String = parsed["candidates"][0]["content"]["parts"]
            .as_array()
            .map(|parts| {
                parts
                    .iter()
                    .filter(|p| !p["thought"].as_bool().unwrap_or(false))
                    .filter_map(|p| p["text"].as_str())
                    .collect::<Vec<_>>()
                    .join("")
            })
            .unwrap_or_default();
        if out.trim().is_empty() {
            let reason = parsed["promptFeedback"]["blockReason"]
                .as_str()
                .or_else(|| parsed["candidates"][0]["finishReason"].as_str())
                .unwrap_or("empty response");
            return Err(format!("The model returned nothing ({reason})"));
        }
        return Ok(out);
    }
}

async fn chat(config: &ModelConfig, mut body: Value) -> Result<String, String> {
    let key = api_key()?;
    let url = endpoint(config, "chat/completions");
    let mut attempt = 0;
    loop {
        attempt += 1;
        let res = client()
            .post(&url)
            .bearer_auth(&key)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Network error: {e}"))?;
        let status = res.status();
        let text = res.text().await.map_err(|e| e.to_string())?;
        if status.is_success() {
            let parsed: Value = serde_json::from_str(&text).map_err(|e| format!("Bad model response: {e}"))?;
            let content = parsed["choices"][0]["message"]["content"].clone();
            return match content {
                Value::String(s) => Ok(s),
                // Some providers return content parts.
                Value::Array(parts) => Ok(parts
                    .iter()
                    .filter_map(|p| p["text"].as_str())
                    .collect::<Vec<_>>()
                    .join("")),
                _ => Err("The model returned an empty response".into()),
            };
        }
        // Providers that do not support response_format: retry once without it.
        if attempt == 1 && status.as_u16() == 400 && text.contains("response_format") {
            body.as_object_mut().map(|o| o.remove("response_format"));
            continue;
        }
        let detail: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
        let message = detail["error"]["message"]
            .as_str()
            .map(str::to_string)
            .unwrap_or_else(|| text.chars().take(300).collect());
        return Err(match status.as_u16() {
            401 => "The API key was rejected. Check it in Settings.".to_string(),
            404 => format!("Model or endpoint not found: {message}"),
            429 => format!("Rate limited: {message}"),
            _ => format!("Model error ({}): {message}", status.as_u16()),
        });
    }
}

/// Pulls the JSON object out of a reply that may be wrapped in code fences or prose.
fn extract_json(s: &str) -> &str {
    let t = s.trim();
    match (t.find('{'), t.rfind('}')) {
        (Some(start), Some(end)) if end > start => &t[start..=end],
        _ => t,
    }
}

fn string_at(v: &Value, key: &str) -> String {
    v[key].as_str().map(str::trim).unwrap_or("").to_string()
}

fn normalize_phrase(raw: Value, id: &str, fallback_lang: &str, source: Value) -> Value {
    let lang = {
        let l = string_at(&raw, "lang").to_lowercase();
        if ["en", "ko", "ja", "es", "zh", "fr"].contains(&l.as_str()) { l } else { fallback_lang.to_string() }
    };
    let tags: Vec<String> = raw["tags"]
        .as_array()
        .map(|a| a.iter().filter_map(|t| t.as_str().map(|s| s.trim().to_string())).filter(|s| !s.is_empty()).take(4).collect())
        .unwrap_or_default();
    let examples: Vec<Value> = raw["examples"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter(|e| e["text"].is_string())
                .map(|e| json!({ "text": string_at(e, "text"), "gloss": string_at(e, "gloss") }))
                .take(4)
                .collect()
        })
        .unwrap_or_default();
    let follow_ups: Vec<Value> = raw["followUps"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter(|f| f["q"].is_string() && f["a"].is_string())
                .map(|f| json!({ "q": string_at(f, "q"), "a": string_at(f, "a") }))
                .take(4)
                .collect()
        })
        .unwrap_or_default();
    let term = string_at(&raw, "term");
    // The practice game splits on exactly three underscores.
    let cloze_sentence = {
        let s = string_at(&raw["cloze"], "sentence");
        let mut out = String::with_capacity(s.len());
        let mut run = 0usize;
        for ch in s.chars() {
            if ch == '_' {
                run += 1;
            } else {
                if run > 0 {
                    out.push_str("___");
                    run = 0;
                }
                out.push(ch);
            }
        }
        if run > 0 {
            out.push_str("___");
        }
        out
    };
    let cloze_answer = {
        let a = string_at(&raw["cloze"], "answer");
        if a.is_empty() { term.clone() } else { a }
    };
    json!({
        "id": id,
        "term": term,
        "reading": string_at(&raw, "reading"),
        "lang": lang,
        "partOfSpeech": string_at(&raw, "partOfSpeech"),
        "tags": tags,
        "definition": string_at(&raw, "definition"),
        "contextMeaning": string_at(&raw, "contextMeaning"),
        "tone": string_at(&raw, "tone"),
        "examples": examples,
        "followUps": follow_ups,
        "shortMeaning": string_at(&raw, "shortMeaning"),
        "cloze": { "sentence": cloze_sentence, "answer": cloze_answer },
        "source": source,
    })
}

#[tauri::command]
pub async fn explain(
    app: AppHandle,
    session_id: String,
    question: String,
    comfort_lang: String,
    learning_lang: String,
    config: ModelConfig,
) -> Result<Value, String> {
    let (crop_path, ocr_text, source) = {
        let state = app.state::<CaptureState>();
        let guard = state.session.lock().unwrap();
        let session = guard.as_ref().filter(|s| s.id == session_id).ok_or("Capture was cancelled")?;
        let crop = session.crop.as_ref().ok_or("Nothing selected yet")?;
        (crop.path.clone(), crop.text.clone(), session.info.source.clone())
    };

    let comfort = language_name(&comfort_lang);
    let learning = language_name(&learning_lang);
    let question = if question.trim().is_empty() { "What does this mean here?".to_string() } else { question.trim().to_string() };
    let ocr_block = if ocr_text.trim().is_empty() { "(no text was recognized; rely on the image)".to_string() } else { ocr_text.trim().to_string() };

    let system = format!(
        r#"You are Teachya, a friendly, culturally fluent language tutor that lives on the learner's Mac. The learner selected a region of their screen and asked a question about it.

Learner: explanations must be written in {comfort}. They are studying {learning}.
Source: app "{app}"{title}.
Text recognized in the selection (OCR, may contain small errors):
"""
{ocr_block}
"""

Identify the single most useful word, phrase, slang term, or expression in the selection that the learner is asking about. If the question names one, use that. Explain it like a sharp friend would: the meaning, what it means in THIS exact context, the tone and register, and how people really use it. Be concrete and brief. Never pad.

Respond with ONLY a JSON object (no markdown) with exactly these keys:
{{
  "term": the expression exactly as written in its original language,
  "reading": romanization or reading aid; empty string if the term is already in the Latin alphabet,
  "lang": ISO code of the term's language, one of en, ko, ja, es, zh, fr,
  "partOfSpeech": short label in {comfort} (e.g. noun, slang, idiom, particle),
  "tags": 2 or 3 short labels in {comfort} (e.g. casual, internet slang, formal, cultural concept),
  "definition": 1 or 2 sentences in {comfort},
  "contextMeaning": 1 to 3 sentences in {comfort} explaining what it means in this selection, quoting the source text,
  "tone": 1 to 3 sentences in {comfort} about register, nuance, who says it to whom, and pitfalls,
  "examples": 2 or 3 objects {{"text": natural sentence in the term's language that uses the term, "gloss": translation in {comfort}}},
  "followUps": 2 or 3 objects {{"q": a short question the learner would naturally ask next, in {comfort}, "a": its answer in {comfort}}},
  "shortMeaning": a 2 to 6 word gloss in {comfort},
  "cloze": {{"sentence": one example sentence in the term's language with the term replaced by ___, "answer": the term}}
}}"#,
        app = if source.app.is_empty() { "unknown" } else { source.app.as_str() },
        title = if source.title.is_empty() { String::new() } else { format!(", window \"{}\"", source.title) },
    );

    let user = format!("Question: {question}");
    let image_png = if config.send_screenshot { std::fs::read(&crop_path).ok() } else { None };
    let prompt = Prompt { system: &system, user: &user, image_png, audio: None, json: true, temperature: 0.4, max_tokens: None };

    let content = complete(&config, &config.model, prompt).await?;
    let raw: Value = serde_json::from_str(extract_json(&content))
        .map_err(|_| "The model did not return valid JSON. Try again or pick a different model.".to_string())?;
    if raw["term"].as_str().map(|s| s.trim().is_empty()).unwrap_or(true) {
        return Err("The model could not find anything to explain in that selection.".into());
    }

    let excerpt: String = ocr_text.trim().chars().take(240).collect();
    let source_json = json!({
        "app": if source.app.is_empty() { "Screen".to_string() } else { source.app.clone() },
        "handle": source.title,
        "text": excerpt,
        "image": crop_path.to_string_lossy(),
    });
    Ok(normalize_phrase(raw, &session_id, &learning_lang, source_json))
}

#[tauri::command]
pub async fn transcribe(audio_base64: String, mime: String, config: ModelConfig) -> Result<String, String> {
    let key = api_key()?;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(audio_base64.as_bytes())
        .map_err(|e| format!("Bad audio: {e}"))?;
    if is_google(&config) {
        // Google has no Whisper-style endpoint; a Gemini model transcribes instead.
        let model = match config.transcribe_model.trim() {
            "" | "whisper-1" => "gemini-flash-latest",
            m => m,
        };
        let prompt = Prompt {
            system: "",
            user: "Transcribe this audio exactly as spoken, in its original language. Reply with only the transcript.",
            image_png: None,
            audio: Some((bytes, &mime)),
            json: false,
            temperature: 0.0,
            max_tokens: None,
        };
        return complete(&config, model, prompt).await.map(|t| t.trim().to_string());
    }
    let ext = if mime.contains("mp4") { "mp4" } else if mime.contains("ogg") { "ogg" } else { "webm" };
    let model = if config.transcribe_model.trim().is_empty() { "whisper-1" } else { config.transcribe_model.trim() };
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(format!("question.{ext}"))
        .mime_str(&mime)
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new().text("model", model.to_string()).part("file", part);
    let res = client()
        .post(endpoint(&config, "audio/transcriptions"))
        .bearer_auth(&key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        let detail: Value = serde_json::from_str(&text).unwrap_or(Value::Null);
        let message = detail["error"]["message"].as_str().unwrap_or(&text).chars().take(300).collect::<String>();
        return Err(format!("Transcription failed ({}): {message}", status.as_u16()));
    }
    let parsed: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    Ok(parsed["text"].as_str().unwrap_or("").trim().to_string())
}

#[tauri::command]
pub async fn test_connection(config: ModelConfig) -> Result<ConnectionTest, String> {
    // Leaves room for thinking models, which spend tokens before answering.
    let prompt = Prompt {
        system: "",
        user: "Reply with the single word OK.",
        image_png: None,
        audio: None,
        json: false,
        temperature: 0.0,
        max_tokens: if is_google(&config) { None } else { Some(5) },
    };
    match complete(&config, &config.model, prompt).await {
        Ok(reply) => Ok(ConnectionTest { ok: true, message: format!("Connected. {} replied: {}", config.model, reply.trim()) }),
        Err(e) if e == "NO_API_KEY" => Ok(ConnectionTest { ok: false, message: "Add an API key first.".into() }),
        Err(e) => Ok(ConnectionTest { ok: false, message: e }),
    }
}
