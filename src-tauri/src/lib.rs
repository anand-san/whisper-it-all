// Declare modules
mod audio;
mod state;
mod api; // Declare the new api module

// Use necessary items from modules and external crates
use state::{
    AppStateRef, AudioConfig, AudioConfigRef, // Use AudioConfigRef
    RecorderState, RecordingFlag, // Use RecordingFlag (Removed SoundState, SoundStateRef)
};
use std::sync::atomic::{AtomicBool, Ordering}; // Use Atomics
// Removed unused: use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::Manager;
use tauri::{Emitter, State, path::BaseDirectory}; // Added BaseDirectory
use tauri::menu::{MenuItem, MenuBuilder}; // Import MenuBuilder, remove MenuSeparator
use tauri::tray::TrayIconBuilder; // Added for Tray Icon
use tauri_plugin_positioner::{Position, WindowExt};
use cpal::traits::{DeviceTrait, HostTrait};
use crossbeam_channel::unbounded; // Use crossbeam channel (Receiver import removed)
use rodio::Sink; // Added rodio imports
use std::fs::File; // Added File import
use std::io::BufReader; // Added BufReader import

// --- Helper Functions ---

/// Emits a state change event to the frontend.
fn emit_state_change(app_handle: &tauri::AppHandle, new_state: RecorderState) {
    println!("Emitting state change: {:?}", new_state);
    if let Err(e) = app_handle.emit("state_changed", &new_state) {
        eprintln!("Failed to emit state_changed event: {}", e);
    }
}

/// Helper function to create a WAV file structure in memory from raw PCM data (i16 little-endian).
/// Moved here from audio.rs as it's used in the post-processing task.
fn create_wav_memory(
    pcm_data: &[i16], // Expecting Vec<i16> now
    channels: u16,
    sample_rate: u32,
) -> Result<Vec<u8>, String> {
    let bits_per_sample: u16 = 16;
    let bytes_per_sample = bits_per_sample / 8; // Should be 2
    let block_align = channels * bytes_per_sample;
    let byte_rate = sample_rate * u32::from(block_align);

    // Convert i16 samples to bytes
    let pcm_data_bytes: Vec<u8> = pcm_data
        .iter()
        .flat_map(|&sample| sample.to_le_bytes())
        .collect();
    let data_size = pcm_data_bytes.len() as u32;

    if data_size == 0 {
        println!("Warning: Creating WAV from empty PCM data.");
    }

    let file_size = 36 + data_size;
    let mut wav_data = Vec::with_capacity(44 + pcm_data_bytes.len());

    // RIFF chunk descriptor
    wav_data.extend_from_slice(b"RIFF");
    wav_data.extend_from_slice(&file_size.to_le_bytes());
    wav_data.extend_from_slice(b"WAVE");
    // fmt sub-chunk
    wav_data.extend_from_slice(b"fmt ");
    wav_data.extend_from_slice(&16u32.to_le_bytes());
    wav_data.extend_from_slice(&1u16.to_le_bytes()); // PCM
    wav_data.extend_from_slice(&channels.to_le_bytes());
    wav_data.extend_from_slice(&sample_rate.to_le_bytes());
    wav_data.extend_from_slice(&byte_rate.to_le_bytes());
    wav_data.extend_from_slice(&block_align.to_le_bytes());
    wav_data.extend_from_slice(&bits_per_sample.to_le_bytes());
    // data sub-chunk
    wav_data.extend_from_slice(b"data");
    wav_data.extend_from_slice(&data_size.to_le_bytes());
    wav_data.extend_from_slice(&pcm_data_bytes);

    Ok(wav_data)
}

/// Plays a sound file using rodio in a separate thread.
fn play_sound_rodio(app_handle: &tauri::AppHandle, sound_name: &str) {
    let sound_path = match app_handle.path().resolve(
        format!("assets/sounds/{}", sound_name),
        BaseDirectory::Resource,
    ) {
        Ok(path) => path,
        Err(e) => {
            eprintln!("Failed to resolve sound path for {}: {}", sound_name, e);
            return;
        }
    };

    // Spawn a thread to play the sound to avoid blocking
    thread::spawn(move || {
        match rodio::OutputStream::try_default() {
            Ok((_stream, stream_handle)) => {
                match File::open(&sound_path) {
                    Ok(file) => {
                        let file = BufReader::new(file);
                        match rodio::Decoder::new(file) {
                            Ok(source) => {
                                let sink = Sink::try_new(&stream_handle).unwrap();
                                sink.append(source);
                                // Wait for the sound to finish playing before the thread exits
                                sink.sleep_until_end();
                                println!("Played sound: {:?}", sound_path);
                            }
                            Err(e) => eprintln!("Error decoding sound file {:?}: {}", sound_path, e),
                        }
                    }
                    Err(e) => eprintln!("Error opening sound file {:?}: {}", sound_path, e),
                }
            }
            Err(e) => eprintln!("Error getting default audio output stream: {}", e),
        }
    });
}


// --- Tauri Commands ---

/// Hide the main window (if used - kept for potential future use)
#[tauri::command]
fn hide_window(window: tauri::AppHandle) -> Result<(), String> {
    window
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?
        .hide()
        .map_err(|e| e.to_string())
}

/// Show the main window (if used - kept for potential future use)
#[tauri::command]
fn show_window(window: tauri::AppHandle) -> Result<(), String> {
    window
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?
        .show()
        .map_err(|e| e.to_string())
}

/// Handles request from frontend or OS to close the recorder window and reset state.
#[tauri::command]
async fn request_close_recorder( // Make async to handle async mutex
    app_handle: tauri::AppHandle,
    // audio_config_ref: State<'_, AudioConfigRef>, // Config doesn't need reset
    app_state_ref: State<'_, AppStateRef>,
    recording_flag: State<'_, RecordingFlag>, // Need flag to ensure it's set to false
) -> Result<(), String> {
    println!("Executing request_close_recorder command...");

    // 1. Ensure recording flag is false
    recording_flag.store(false, Ordering::SeqCst);
    println!("Recording flag set to false.");

    // 2. Reset AppState to Idle (using async lock)
    {
        let mut app_state = app_state_ref.lock().await; // Use .await
        *app_state = RecorderState::Idle;
        println!("App state reset to Idle.");
        // Emit state change after resetting
        emit_state_change(&app_handle, RecorderState::Idle);
    }

    // 3. Hide the recorder window
    if let Some(window) = app_handle.get_webview_window("recorder") {
        println!("Hiding recorder window via request_close_recorder.");
        window
            .hide()
            .map_err(|e| format!("Failed to hide recorder window: {}", e))?;
    } else {
        eprintln!("Recorder window not found during request_close_recorder.");
    }

    Ok(())
}

/// New command callable by the frontend to get AI response for given text.
#[tauri::command]
async fn get_ai_response(
    transcription: String,
) -> Result<String, String> {
    println!("Executing get_ai_response command for: '{}'", transcription);
    api::get_ai_response_local(transcription).await
}


// --- Application Entry Point ---

// Make run async because we use .await for mutexes inside setup/commands
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main] // Use tokio main runtime
pub async fn run() { // Make run async
    // Initialize states
    let audio_config = AudioConfigRef::new(tokio::sync::Mutex::new(AudioConfig::new())); // Use tokio Mutex
    let app_state = AppStateRef::new(tokio::sync::Mutex::new(RecorderState::Idle)); // Use tokio Mutex
    let recording_flag = RecordingFlag::new(AtomicBool::new(false)); // Initialize recording flag

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            request_close_recorder, // Now async
            get_ai_response
        ])
        .manage(audio_config.clone())
        .manage(app_state.clone())
        .manage(recording_flag.clone()) // Manage the recording flag
        // SoundStateRef management removed
        .setup(move |app| {
            #[cfg(target_os = "macos")]{
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            };

            // --- Setup System Tray ---
            let app_handle_tray = app.handle().clone(); // Clone handle for tray event handler
            // Create menu items first
            let show_chat_i = MenuItem::with_id(&app_handle_tray, "show_chat", "Show Chat", true, None::<&str>)?;
            let show_settings_i = MenuItem::with_id(&app_handle_tray, "show_settings", "Settings", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(&app_handle_tray, "quit", "Exit", true, None::<&str>)?;

            // Use MenuBuilder
            let tray_menu = MenuBuilder::new(&app_handle_tray)
                .item(&show_chat_i)
                .item(&show_settings_i)
                .separator() // Use the builder method for separator
                .item(&quit_i)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().ok_or("Failed to get default window icon")?)
                .tooltip("Vaiced")
                .menu(&tray_menu)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show_chat" => {
                            if let Some(window) = app.get_webview_window("ai_interaction") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            } else {
                                eprintln!("ai_interaction window not found");
                            }
                        }
                        "show_settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            } else {
                                eprintln!("main window not found");
                            }
                        }
                        "quit" => {
                            println!("Exit requested from tray menu.");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                // Optional: Handle tray icon click events if needed
                // .on_tray_icon_event(|tray, event| {
                //     if let TrayIconEvent::Click { .. } = event {
                //         // Example: toggle main window on left click
                //         // let app = tray.app_handle();
                //         // if let Some(window) = app.get_webview_window("main") {
                //         //     let _ = window.show();
                //         //     let _ = window.set_focus();
                //         // }
                //     }
                // })
                .build(app)?;


            // --- Setup Global Shortcut ---
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };

                let recorder_shortcut = Shortcut::new(Some(Modifiers::META), Code::Backquote);
                let ai_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Backquote); // ALT for Option key

                if let Some(recorder_window) = app.get_webview_window("recorder") {
                    let _ = recorder_window.move_window(Position::TopCenter); 
                    let _ = recorder_window.hide();

                    let app_handle_listener = app.handle().clone();
                    let app_state_listener = app_state.clone();
                    let recording_flag_listener = recording_flag.clone();
                    recorder_window.on_window_event(move |event| {
                         if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                              println!("Recorder Window Close Requested (OS event)");
                              api.prevent_close();
                              let handle = app_handle_listener.clone();
                              let _state = app_state_listener.clone(); // Prefixed unused var
                              let _flag = recording_flag_listener.clone(); // Prefixed unused var
                              // Spawn a task to run the async command
                              tokio::spawn(async move {
                                  // Get State wrappers inside the async task using the handle
                                 let state_wrapper = handle.state::<AppStateRef>();
                                  let flag_wrapper = handle.state::<RecordingFlag>();
                                  let _ = request_close_recorder(
                                      handle.clone(), // Clone handle to avoid move error
                                      state_wrapper, // Pass the State wrapper
                                      flag_wrapper, // Pass the State wrapper
                                  ).await;
                              });
                        }
                    });
                } else {
                    eprintln!("Failed to get recorder window during setup.");
                }

                // --- AI Interaction Window Setup ---
                if let Some(ai_window) = app.get_webview_window("ai_interaction") {
                    println!("Setting up AI interaction window (TopRight, hidden)...");
                    let _ = ai_window.move_window(Position::TopRight); // Set position
                    let _ = ai_window.hide(); // Hide initially
                    // Optional: Add close handler if needed, similar to recorder
                    // ai_window.on_window_event(...)
                } else {
                    eprintln!("Failed to get ai_interaction window during setup.");
                }


                // --- Global Shortcut Handler ---
                // Need to clone states again for the handler's lifetime
                let audio_config_handler = audio_config.clone();
                let app_state_handler = app_state.clone();
                // sound_state_handler clone removed
                let recording_flag_handler = recording_flag.clone();

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, shortcut, event| {
                            // Clone Arcs needed inside the async block
                            let audio_config_clone = audio_config_handler.clone();
                            let app_state_clone = app_state_handler.clone();
                            // sound_state_clone clone removed
                            let recording_flag_clone = recording_flag_handler.clone();
                            let app_handle_clone = app.clone(); // Clone AppHandle
                            let shortcut_clone = shortcut.clone(); // Clone shortcut value here

                            // Spawn a tokio task to handle the logic asynchronously
                            // This prevents blocking the shortcut handler thread
                            tokio::spawn(async move {
                                // Use the cloned shortcut value inside the async block

                                // --- Recorder Shortcut Logic ---
                                if shortcut_clone == recorder_shortcut {
                                    if let Some(recorder_window) = app_handle_clone.get_webview_window("recorder") {
                                        let mut current_app_state = app_state_clone.lock().await; // Use .await

                                        match event.state() {
                                            // --- Shortcut Pressed ---
                                            ShortcutState::Pressed => {
                                                match *current_app_state {
                                                    RecorderState::Idle => {
                                                        println!("Shortcut Pressed: Idle -> Recording");
                                                        *current_app_state = RecorderState::Recording;
                                                        emit_state_change(&app_handle_clone, RecorderState::Recording);
                                                        drop(current_app_state); // Release lock before sync operations

                                                        // Show window & focus (sync)
                                                        let _ = recorder_window.show();
                                                        let _ = recorder_window.set_focus();

                                                        // Play start sound using rodio
                                                        play_sound_rodio(&app_handle_clone, "record-start.mp3");

                                                        // Reset recording flag (sync atomic)
                                                        recording_flag_clone.store(false, Ordering::SeqCst); // Ensure false before setting true

                                                        // Prepare for recording thread (sync cpal)
                                                        let host = cpal::default_host();
                                                        let device = match host.default_input_device() {
                                                            Some(d) => d,
                                                            None => {
                                                                eprintln!("Error: No input device available");
                                                                let mut state = app_state_clone.lock().await;
                                                                *state = RecorderState::Idle; // Revert state
                                                                emit_state_change(&app_handle_clone, RecorderState::Idle);
                                                                let _ = recorder_window.hide();
                                                                return;
                                                            }
                                                        };
                                                        let config = match device.default_input_config() {
                                                            Ok(c) => c,
                                                            Err(e) => {
                                                                eprintln!("Error getting default input config: {}", e);
                                                                let mut state = app_state_clone.lock().await;
                                                                *state = RecorderState::Idle; // Revert state
                                                                emit_state_change(&app_handle_clone, RecorderState::Idle);
                                                                let _ = recorder_window.hide();
                                                                return;
                                                            }
                                                        };

                                                        // Store config details (async lock)
                                                        let sample_format = config.sample_format();
                                                        {
                                                            let mut audio_config_guard = audio_config_clone.lock().await;
                                                            audio_config_guard.sample_rate = config.sample_rate().0;
                                                            audio_config_guard.channels = config.channels();
                                                        }

                                                        // Create channel for audio data (sync)
                                                        let (tx, rx) = unbounded::<Vec<i16>>();

                                                        // Set recording flag to true (sync atomic)
                                                        recording_flag_clone.store(true, Ordering::SeqCst);

                                                        // Spawn the synchronous recording thread (sync)
                                                        let flag_thread = recording_flag_clone.clone();
                                                        thread::spawn(move || {
                                                            println!("Recording thread started.");
                                                            if let Err(err) = audio::record_audio_stream(
                                                                flag_thread.clone(), // Pass flag
                                                                tx, // Pass sender
                                                                device,
                                                                config,
                                                                sample_format,
                                                            ) {
                                                                eprintln!("Recording error: {}", err);
                                                                // Ensure flag is reset on error
                                                                flag_thread.store(false, Ordering::SeqCst);
                                                            }
                                                            println!("Recording thread finished.");
                                                        });

                                                        // Store receiver in App state or pass differently?
                                                        // For simplicity, let's handle receiver in the release task
                                                        // We need to pass 'rx' to the release handler's task.
                                                        // This is tricky as the handler is recreated.
                                                        // Alternative: Store Option<Receiver> in AppState? Risky.
                                                        // Let's try creating the channel *outside* the handler if possible,
                                                        // or manage it via a dedicated state.
                                                        // --- Re-think: Create channel in setup, manage Sender/Receiver via state ---
                                                        // This seems overly complex. Let's stick to creating channel on press
                                                        // and passing receiver to the release task via another mechanism if needed.
                                                        // --- Simplest: Pass receiver to the tokio task spawned on release ---
                                                        // We can achieve this by storing the receiver temporarily, maybe in AppState?
                                                        // Let's try storing Option<Receiver> in AppState for now.
                                                        // **Correction:** No, AppState is shared. Cannot store receiver there easily.
                                                        // **New Approach:** Spawn the post-processing task *here* on press,
                                                        // but have it wait for the release signal (e.g., flag turning false).

                                                        // --- Spawn Post-Processing Task on PRESS ---
                                                        let app_handle_post = app_handle_clone.clone();
                                                        let audio_config_post = audio_config_clone.clone();
                                                        let app_state_post = app_state_clone.clone();
                                                        // sound_state_post clone removed
                                                        let recording_flag_post = recording_flag_clone.clone();

                                                        tokio::spawn(async move {
                                                            println!("Post-processing task spawned, waiting for recording flag...");

                                                            // Wait until recording flag is set to false
                                                            while recording_flag_post.load(Ordering::SeqCst) {
                                                                tokio::time::sleep(Duration::from_millis(50)).await;
                                                            }
                                                            println!("Post-processing task detected recording stopped.");

                                                            // --- Collect data from channel ---
                                                            let mut all_pcm_data = Vec::new();
                                                            while let Ok(chunk) = rx.try_recv() { // Use try_recv in a loop after flag is false
                                                                all_pcm_data.extend(chunk);
                                                            }
                                                            // Drain any remaining items after loop (might be needed)
                                                            while let Ok(chunk) = rx.try_recv() {
                                                                all_pcm_data.extend(chunk);
                                                            }
                                                            println!("Collected {} samples from channel.", all_pcm_data.len());

                                                            // Get config (async lock)
                                                            let audio_config_guard = audio_config_post.lock().await;
                                                            let sample_rate = audio_config_guard.sample_rate;
                                                            let channels = audio_config_guard.channels;
                                                            drop(audio_config_guard);

                                                            if all_pcm_data.is_empty() {
                                                                println!("Post-processing: Audio data is empty. Resetting state.");
                                                                let mut state = app_state_post.lock().await;
                                                                *state = RecorderState::Idle;
                                                                emit_state_change(&app_handle_post, RecorderState::Idle);
                                                                return;
                                                            }

                                                            // Create WAV data
                                                            let wav_data = match create_wav_memory(&all_pcm_data, channels, sample_rate) {
                                                                Ok(data) => data,
                                                                Err(e) => {
                                                                    eprintln!("Failed to create WAV data: {}", e);
                                                                    let mut state = app_state_post.lock().await;
                                                                    *state = RecorderState::Idle;
                                                                    emit_state_change(&app_handle_post, RecorderState::Idle);
                                                                    return;
                                                                }
                                                            };

                                                            // Calculate duration
                                                            let data_size = wav_data.len().saturating_sub(44);
                                                            let bytes_per_sample = 2u32;
                                                            let duration_secs = if sample_rate > 0 && channels > 0 {
                                                                data_size as f32 / (sample_rate * u32::from(channels) * bytes_per_sample) as f32
                                                            } else { 0.0 };
                                                            println!("Post-processing: Calculated duration: {:.2}s", duration_secs);

                                                            if duration_secs > 1.0 {
                                                                println!("Post-processing: Duration > 1s. Starting transcription.");
                                                                { // Set state to Transcribing
                                                                    let mut state = app_state_post.lock().await;
                                                                    *state = RecorderState::Transcribing;
                                                                    emit_state_change(&app_handle_post, RecorderState::Transcribing);
                                                                }

                                                                // Play end sound call removed from here

                                                                // Call transcription API
                                                                match api::transcribe_audio_local(wav_data).await {
                                                                    Ok(text) => {
                                                                        println!("Transcription successful: '{}'", text);
                                                                        // --- Handle AI Interaction Window Directly ---
                                                                        if let Some(ai_window) = app_handle_post.get_webview_window("ai_interaction") {
                                                                            println!("Found ai_interaction window, showing and sending data...");
                                                                            let payload = serde_json::json!({ "text": text });
                                                                            // Show, focus, and emit directly to the window
                                                                            // Use a separate task to avoid blocking the post-processing flow if window interaction hangs
                                                                            tokio::spawn(async move {
                                                                                if let Err(e) = ai_window.show() { eprintln!("Failed to show ai_interaction window: {}", e); } // Removed .await
                                                                                if let Err(e) = ai_window.set_focus() { eprintln!("Failed to focus ai_interaction window: {}", e); } // Removed .await
                                                                                if let Err(e) = ai_window.emit("trigger_ai_interaction", &payload) {
                                                                                    eprintln!("Failed to emit trigger_ai_interaction to ai_interaction window: {}", e);
                                                                                }
                                                                            });
                                                                        } else {
                                                                            eprintln!("Error: ai_interaction window not found. Cannot display transcription.");
                                                                            // Optionally emit a global error event if needed
                                                                        }
                                                                    }
                                                                    Err(e) => {
                                                                        eprintln!("Transcription failed: {}", e);
                                                                        if let Err(e_emit) = app_handle_post.emit("processing_error", &serde_json::json!({ "stage": "transcription", "message": e })) {
                                                                            eprintln!("Failed to emit processing_error event: {}", e_emit);
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                println!("Post-processing: Duration <= 1s. Resetting state.");
                                                            }

                                                            // Reset state to Idle
                                                            {
                                                                let mut state = app_state_post.lock().await;
                                                                *state = RecorderState::Idle;
                                                                emit_state_change(&app_handle_post, RecorderState::Idle);
                                                            }
                                                            println!("Post-processing task finished.");
                                                        }); // End of post-processing tokio::spawn

                                                    }
                                                    RecorderState::Recording | RecorderState::Transcribing => {
                                                        println!("Shortcut Pressed: State is {:?} (Ignoring)", *current_app_state);
                                                    }
                                                }
                                            }
                                            // --- Shortcut Released ---
                                            ShortcutState::Released => {
                                                let current_state = *current_app_state; // Read state before releasing lock
                                                drop(current_app_state); // Release lock

                                                if let RecorderState::Recording = current_state {
                                                    println!("Shortcut Released: Recording -> Processing...");

                                                    // 1. Immediately hide the window (sync)
                                                    let _ = recorder_window.hide();

                                                    // 2. Play end sound immediately on release
                                                    play_sound_rodio(&app_handle_clone, "record-end.mp3");

                                                    // 3. Signal recording thread and post-processing task to stop (sync atomic)
                                                    println!("Setting recording flag to false.");
                                                    recording_flag_clone.store(false, Ordering::SeqCst);

                                                    // Post-processing task was already spawned on press and will detect the flag change.

                                                } else {
                                                    println!("Shortcut Released: Not in Recording state (Ignoring)");
                                                    if recorder_window.is_visible().unwrap_or(false) {
                                                        let _ = recorder_window.hide();
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        eprintln!("Recorder window not found in shortcut handler.");
                                    }
                                // --- AI Shortcut Logic ---
                                } else if shortcut_clone == ai_shortcut {
                                    if event.state() == ShortcutState::Pressed {
                                        println!("AI Shortcut (Alt+`) Pressed: Showing AI Interaction Window");
                                        if let Some(ai_window) = app_handle_clone.get_webview_window("ai_interaction") {
                                            // Use tokio::spawn for window operations to avoid blocking handler
                                            tokio::spawn(async move {
                                                // Position might have already been set in setup, but setting again ensures it if setup failed
                                                if let Err(e) = ai_window.move_window(Position::TopRight) { eprintln!("Failed to move ai_interaction window: {}", e); }
                                                if let Err(e) = ai_window.show() { eprintln!("Failed to show ai_interaction window: {}", e); }
                                                if let Err(e) = ai_window.set_focus() { eprintln!("Failed to focus ai_interaction window: {}", e); }
                                            });
                                        } else {
                                            eprintln!("AI Interaction window not found in shortcut handler.");
                                        }
                                    }
                                    // No specific action needed on release for the AI shortcut
                                }
                            }); // End of outer tokio::spawn for handler logic
                        }) // End of with_handler closure
                        .build(),
                )?;

                // Register the shortcuts
                let shortcut_manager = app.global_shortcut();
                if let Err(e) = shortcut_manager.register(recorder_shortcut.clone()) {
                    eprintln!("Failed to register recorder shortcut (Meta+`): {}", e);
                } else {
                    println!("Recorder shortcut (Meta+`) registered successfully.");
                }
                if let Err(e) = shortcut_manager.register(ai_shortcut.clone()) {
                    eprintln!("Failed to register AI shortcut (Alt+`): {}", e);
                } else {
                    println!("AI shortcut (Alt+`) registered successfully.");
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!()) // Use build instead of run for async setup
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event { // Use run loop for async runtime
            tauri::RunEvent::ExitRequested { .. } => {
                // Allow the app to exit naturally when requested,
                // including when triggered by app.exit(0) from the tray menu.
                println!("Exit requested, allowing exit.");
            }
            _ => {}
        });
}
