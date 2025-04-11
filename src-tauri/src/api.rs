use tauri_plugin_http::reqwest::header::{HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use tauri_plugin_http::reqwest::multipart::{Form, Part};
use serde::Deserialize;
use std::time::Duration;

// --- Structs for API Responses ---

#[derive(Deserialize, Debug)]
struct TranscriptionResponse {
    text: String,
}

#[derive(Deserialize, Debug)]
struct ChatResponse {
    // Updated to match the actual backend response field {"response": "..."}
    response: String,
}

// --- Constants ---

// Using lazy_static for the global reqwest client (now from the plugin)
lazy_static::lazy_static! {
    static ref HTTP_CLIENT: tauri_plugin_http::reqwest::Client = tauri_plugin_http::reqwest::Client::builder()
        .timeout(Duration::from_secs(120)) // Set a reasonable timeout (e.g., 2 minutes)
        .build()
        .expect("Failed to build reqwest client");
}

// Read from environment variable or use default
// Using lazy_static to read the env var once
lazy_static::lazy_static! {
    static ref LOCAL_BACKEND_URL: String = std::env::var("LOCAL_BACKEND_URL")
        .unwrap_or_else(|_| {
            println!("Warning: LOCAL_BACKEND_URL environment variable not found. Using default: http://localhost:3000");
            "http://localhost:3000".to_string() // Corrected default port
        });
}
const AUTH_HEADER_VALUE: &str = "INTERNAL"; // Hardcoded as requested

// --- API Client Functions ---

/// Sends audio data to the local backend for transcription.
pub(crate) async fn transcribe_audio_local(wav_data: Vec<u8>) -> Result<String, String> {
    let audio_part = Part::bytes(wav_data)
        .file_name("audio.wav") // Backend expects 'file' field, filename doesn't strictly matter here
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to create audio MIME part: {}", e))?;

    let form = Form::new().part("audio", audio_part); // Changed field name to 'audio' to match backend schema

    // Use the lazy_static variable (dereference needed)
    let url = format!("{}/transcribe", &*LOCAL_BACKEND_URL); // Endpoint from service.ts

    println!("Sending transcription request to: {}", url);

    let response = HTTP_CLIENT
        .post(&url)
        .header(AUTHORIZATION, HeaderValue::from_static(AUTH_HEADER_VALUE))
        // Content-Type is set automatically for multipart/form-data by reqwest
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Transcription network request failed: {}", e))?;

    let status = response.status();
    let response_body = response
        .text()
        .await
        .unwrap_or_else(|_| "Failed to read response body".to_string());

    println!(
        "Transcription response status: {}, body: {}",
        status, response_body
    );

    if !status.is_success() {
        return Err(format!(
            "Transcription API error: {} - {}",
            status, response_body
        ));
    }

    // Try to parse the successful response body as JSON
    let result: TranscriptionResponse = serde_json::from_str(&response_body)
        .map_err(|e| format!("Failed to parse transcription JSON response: {}", e))?;

    Ok(result.text)
}

/// Sends transcription text to the local backend to get an AI response.
pub(crate) async fn get_ai_response_local(transcription: String) -> Result<String, String> {
    // Use the lazy_static variable (dereference needed)
    let url = format!("{}/chat/nostream", &*LOCAL_BACKEND_URL); // Endpoint from service.ts (assuming it handles the messages format)

    // Backend expects { "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}] }
    // based on the ZodError and StreamChatSchema in service.ts
    let request_body = serde_json::json!({
        "text": transcription
    });

    println!(
        "Sending AI chat request to: {} with body: {}",
        url,
        serde_json::to_string(&request_body).unwrap_or_default()
    );

    let response = HTTP_CLIENT
        .post(&url)
        .header(AUTHORIZATION, HeaderValue::from_static(AUTH_HEADER_VALUE))
        .header(CONTENT_TYPE, HeaderValue::from_static("application/json"))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("AI chat network request failed: {}", e))?;

    let status = response.status();
    let response_body = response
        .text()
        .await
        .unwrap_or_else(|_| "Failed to read response body".to_string());

    println!(
        "AI chat response status: {}, body: {}",
        status, response_body
    );

    if !status.is_success() {
        return Err(format!("AI API error: {} - {}", status, response_body));
    }

    // Try to parse the successful response body as JSON
    let result: ChatResponse = serde_json::from_str(&response_body)
        .map_err(|e| format!("Failed to parse AI chat JSON response: {}", e))?;

    Ok(result.response) // Return the 'response' field based on the updated ChatResponse struct
}
