use crate::state::RecordingFlag; // Use the new RecordingFlag type alias
use cpal::traits::{DeviceTrait, StreamTrait};
use crossbeam_channel::Sender; // Use the channel sender
use std::sync::atomic::Ordering; // For AtomicBool operations
use std::thread;
use std::time::Duration;

// --- Constants ---
// Define chunk size for sending data through the channel
const AUDIO_CHUNK_SIZE_SAMPLES: usize = 1024;

// --- Core Recording Function ---

/// Function to handle audio recording (runs in a separate thread).
/// Captures raw PCM data (as i16) and sends it through a channel.
pub(crate) fn record_audio_stream(
    recording_flag: RecordingFlag, // Use the atomic flag
    data_sender: Sender<Vec<i16>>, // Channel to send audio chunks
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
    sample_format: cpal::SampleFormat,
) -> Result<(), String> {
    let err_fn = |err| eprintln!("an error occurred on the audio stream: {}", err);
    let stream_config: cpal::StreamConfig = config.into();
    let flag_clone = recording_flag.clone(); // Clone Arc for the stream closure

    println!(
        "Audio Stream: {} Hz, {} ch, {:?}",
        stream_config.sample_rate.0, stream_config.channels, sample_format
    );

    // --- Stream Building ---
    // Closure to handle data processing and sending
    let process_data = move |data: &[i16]| {
        if flag_clone.load(Ordering::SeqCst) {
            // Send data in chunks
            for chunk in data.chunks(AUDIO_CHUNK_SIZE_SAMPLES) {
                match data_sender.send(chunk.to_vec()) {
                    Ok(_) => {} // Data sent successfully
                    Err(e) => {
                        eprintln!("Audio thread failed to send data: {}. Stopping.", e);
                        // Signal stop if channel breaks
                        flag_clone.store(false, Ordering::SeqCst);
                        break; // Exit chunk loop
                    }
                }
            }
        }
    };

    // Build the input stream based on sample format
    let stream = match sample_format {
        cpal::SampleFormat::I16 => device.build_input_stream(
            &stream_config,
            move |data: &[i16], _: &_| process_data(data),
            err_fn,
            None,
        ),
        cpal::SampleFormat::U16 => device.build_input_stream(
            &stream_config,
            move |data: &[u16], _: &_| {
                let converted_data: Vec<i16> = data
                    .iter()
                    .map(|&s| s.saturating_sub(32768) as i16)
                    .collect();
                process_data(&converted_data);
            },
            err_fn,
            None,
        ),
        cpal::SampleFormat::F32 => device.build_input_stream(
            &stream_config,
            move |data: &[f32], _: &_| {
                let converted_data: Vec<i16> = data
                    .iter()
                    .map(|&s| (s.clamp(-1.0, 1.0) * 32767.0) as i16)
                    .collect();
                process_data(&converted_data);
            },
            err_fn,
            None,
        ),
        _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
    }
    .map_err(|e| format!("Could not build input stream: {}", e))?;

    // --- Stream Playback and Recording Loop ---
    stream
        .play()
        .map_err(|e| format!("Could not start stream: {}", e))?;
    println!("Recording stream started. Sending data via channel.");

    // Loop relies on the atomic recording_flag.
    // The stream callback checks the flag internally.
    // This thread just needs to keep the stream alive until the flag is false.
    while recording_flag.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(50)); // Check flag periodically
    }

    println!("Recording stream stopping (flag turned false)...");
    drop(stream); // Drop the stream explicitly to stop hardware interaction.
                  // This also signals the end of data to the receiver if the channel wasn't closed by error.
    println!("Recording stream stopped.");

    // WAV creation is now handled by the receiver of the channel data in lib.rs

    Ok(())
}

// Removed create_wav_memory function (moved logic to lib.rs post-processing task)
