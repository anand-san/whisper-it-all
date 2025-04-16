# Vaiced - Voice-Activated AI Assistant

## Product Overview

Vaiced is a desktop application that enables seamless voice-to-AI interaction through a minimalist, non-intrusive interface. The application allows users to quickly record voice snippets using global keyboard shortcuts, automatically transcribes the audio, and presents the transcription to an AI assistant for immediate response—all within a streamlined workflow.

## Key Features

### 1. Effortless Voice Recording

- **Global Shortcut Activation**: Record anytime by pressing and holding Command/Meta + ` (backtick)
- **Visual Feedback**: Minimalist floating window with a pulsing orb indicates active recording
- **Audio Cues**: Distinct sounds play at the start and end of recording sessions
- **Release to Process**: Simply release the shortcut key to end recording and trigger processing

### 2. Intelligent Audio Processing

- **Automatic Transcription**: Voice recordings are converted to text using local processing
- **Duration Filtering**: Only processes recordings longer than 1 second to avoid accidental activations
- **Background Processing**: All audio handling happens in separate threads for optimal performance

### 3. AI Assistant Integration

- **Contextual Responses**: AI processes transcribed text and provides relevant responses
- **Dedicated Interaction Window**: Clean interface for viewing AI responses and continued conversation
- **Direct Access**: Alternative shortcut (Alt + `) to access the AI assistant directly with text input
- **Conversation Threading**: Support for ongoing conversations with context preservation

## Technical Architecture

### Frontend

- React + TypeScript with TailwindCSS for responsive UI
- Multiple specialized windows (main app, recorder feedback, AI interaction)
- UI components from assistant-ui for rich message formatting

### Backend

- Rust-powered Tauri framework for native performance
- Secure, efficient audio processing pipeline
- State machine architecture to manage recording and processing states
- Multi-threaded design with non-blocking I/O for responsive experience

### Integration Capabilities

- Local audio processing with minimal latency
- Integration with OpenAI for AI conversation capabilities
- Extensible architecture for additional AI model support

## User Experience

- **Lightweight**: Minimal resource footprint while running in the background
- **Always Available**: Global shortcuts provide instant access from any application
- **Non-disruptive**: Small, focused windows avoid interrupting workflow
- **Fluid Interaction**: Seamless transition from voice to text to AI response

## Target Users

- Knowledge workers seeking quick information without context switching
- Professionals who need hands-free access to AI assistance
- Anyone looking to enhance productivity through voice-activated AI tools
- Developers and creators who want quick answers during their workflow

## Competitive Advantage

- **Speed**: From voice to AI response in seconds with minimal user interaction
- **Minimal Interface**: Designed to complement rather than interrupt existing workflows
- **Desktop Native**: Not dependent on browser or web connectivity for core functions
- **Privacy-focused**: Local processing options for sensitive environments
