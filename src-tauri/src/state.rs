// Removed: use soloud::*;
use std::sync::atomic::AtomicBool; // Import Atomics (Removed Ordering)
use std::sync::Arc; // Keep Arc
use tokio::sync::Mutex; // Use Tokio's async-aware Mutex

// --- State Definitions ---

// Audio state - simplified, only holds config now.
// Recording flag is separate AtomicBool, data is sent via channel.
#[derive(Debug, Clone)]
pub(crate) struct AudioConfig {
    pub(crate) sample_rate: u32,
    pub(crate) channels: u16,
}

impl AudioConfig {
    pub(crate) fn new() -> Self {
        Self {
            sample_rate: 44100, // Default
            channels: 1,        // Default
        }
    }
}

// Type alias for managed AudioConfig
pub type AudioConfigRef = Arc<Mutex<AudioConfig>>;

// Separate AtomicBool for the recording flag, shared across threads
pub type RecordingFlag = Arc<AtomicBool>;

// Global application state for shortcut logic
#[derive(Clone, Copy, Debug, PartialEq, serde::Serialize)] // Add Serialize for events
#[serde(rename_all = "camelCase")] // Match frontend conventions
pub enum RecorderState {
    Idle,
    Recording,
    Transcribing, // New state for when transcription is happening
}

// Type alias for managed RecorderState (AppState)
pub type AppStateRef = Arc<Mutex<RecorderState>>;

// --- Sound State Removed ---
// SoundState struct, impl, and SoundStateRef type alias were removed.
// Sound playback will be handled directly using rodio in lib.rs.
