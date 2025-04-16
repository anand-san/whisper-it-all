use xcap::Monitor; // Use xcap::Monitor instead of screenshots::Screen
use image::codecs::png::PngEncoder;
use image::ImageEncoder; // Keep ImageEncoder
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::io::Cursor;
use std::time::Duration;
use std::thread;
use tauri::{AppHandle, Emitter}; // Use Emitter trait
use serde::{Serialize, Deserialize};

// Event payloads for screenshot operations
#[derive(Clone, Serialize, Deserialize)]
pub struct ScreenshotStatus {
    status: String, // "processing", "idle", "error"
    progress: Option<f32>,
    error: Option<String>,
}

// Screenshot related event names
const EVENT_SCREENSHOT_STATUS: &str = "screenshot:status";
const EVENT_SCREENSHOT_RESULT: &str = "screenshot:result";
const EVENT_SCREENSHOT_ERROR: &str = "screenshot:error";

/// Capture screenshot command
/// This command initiates the screenshot process asynchronously and returns immediately.
/// Results are sent via events.
#[tauri::command]
pub fn capture_screenshot(app_handle: AppHandle) -> Result<(), String> {
    // Clone the app_handle for use in the thread
    let app_handle_clone = app_handle.clone();
    
    // Start screenshot capture in a background thread to avoid blocking
    thread::spawn(move || {
        // Emit initial status
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.0),
                error: None,
            }
        );
        
        // Need to wait a tiny bit for any UI elements (like a capture button) to disappear
        thread::sleep(Duration::from_millis(250));
        
        // Emit progress update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.1),
                error: None,
            }
        );
        
        // Get all monitors - handle xcap error explicitly
        let monitors = match Monitor::all() {
            Ok(monitors) => monitors,
            Err(err) => {
                let error_msg = format!("Failed to get monitors: {}", err);
                _ = app_handle_clone.emit(EVENT_SCREENSHOT_ERROR, &error_msg);
                _ = app_handle_clone.emit(
                    EVENT_SCREENSHOT_STATUS, 
                    ScreenshotStatus {
                        status: "error".to_string(),
                        progress: None,
                        error: Some(error_msg.clone()),
                    }
                );
                return;
            }
        };
        
        // Emit progress update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.2),
                error: None,
            }
        );
        
        // Get the primary monitor
        let primary_monitor = match monitors.into_iter().next() {
            Some(monitor) => monitor,
            None => {
                let error_msg = "No monitors found".to_string();
                _ = app_handle_clone.emit(EVENT_SCREENSHOT_ERROR, &error_msg);
                _ = app_handle_clone.emit(
                    EVENT_SCREENSHOT_STATUS, 
                    ScreenshotStatus {
                        status: "error".to_string(),
                        progress: None,
                        error: Some(error_msg.clone()),
                    }
                );
                return;
            }
        };
        
        // Log the monitor we're capturing
        match primary_monitor.name() {
            Ok(name) => println!("Capturing monitor: {}", name),
            Err(err) => println!("Capturing monitor (unknown name): {}", err),
        }
        
        // Emit progress update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.4),
                error: None,
            }
        );
        
        // Capture the image - handle xcap error explicitly
        let img_buf = match primary_monitor.capture_image() {
            Ok(img) => img,
            Err(err) => {
                let error_msg = format!("Failed to capture screen: {}", err);
                _ = app_handle_clone.emit(EVENT_SCREENSHOT_ERROR, &error_msg);
                _ = app_handle_clone.emit(
                    EVENT_SCREENSHOT_STATUS, 
                    ScreenshotStatus {
                        status: "error".to_string(),
                        progress: None,
                        error: Some(error_msg.clone()),
                    }
                );
                return;
            }
        };
        
        // Emit progress update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.6),
                error: None,
            }
        );
        
        // Encode the RgbaImage buffer to PNG format in memory
        let mut png_bytes: Vec<u8> = Vec::new();
        let encoder = PngEncoder::new(Cursor::new(&mut png_bytes));
        
        // Encode image - handle error explicitly
        match encoder.write_image(
            &img_buf,
            img_buf.width(),
            img_buf.height(),
            image::ColorType::Rgba8.into(),
        ) {
            Ok(_) => {},
            Err(err) => {
                let error_msg = format!("Failed to encode image: {}", err);
                _ = app_handle_clone.emit(EVENT_SCREENSHOT_ERROR, &error_msg);
                _ = app_handle_clone.emit(
                    EVENT_SCREENSHOT_STATUS, 
                    ScreenshotStatus {
                        status: "error".to_string(),
                        progress: None,
                        error: Some(error_msg.clone()),
                    }
                );
                return;
            }
        }
        
        // Emit progress update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.8),
                error: None,
            }
        );
        
        // Encode PNG bytes to Base64
        let base64_string = STANDARD.encode(&png_bytes);
        
        // Emit progress update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "processing".to_string(),
                progress: Some(0.9),
                error: None,
            }
        );
        
        // Send the successful result
        _ = app_handle_clone.emit(EVENT_SCREENSHOT_RESULT, &base64_string);
        
        // Final status update
        _ = app_handle_clone.emit(
            EVENT_SCREENSHOT_STATUS, 
            ScreenshotStatus {
                status: "idle".to_string(),
                progress: Some(1.0),
                error: None,
            }
        );
    });
    
    // Return immediately while processing continues in background
    Ok(())
}
