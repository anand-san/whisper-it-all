# Vaiced - Voice-Activated AI Assistant

Vaiced is a desktop application that enables seamless voice-to-AI interaction through a minimalist, non-intrusive interface. The application allows users to quickly record voice snippets using global keyboard shortcuts, automatically transcribes the audio, and presents the transcription to an AI assistant for immediate response—all within a streamlined workflow.

## Features

- **Voice-to-AI in Seconds**: Record your voice, get AI responses instantly
- **Global Keyboard Shortcuts**: Access anywhere, anytime without switching applications
- **Minimalist Interface**: Non-intrusive, focused windows that don't disrupt workflow
- **Rich AI Interactions**: Full conversation support with context preservation
- **Native Desktop Performance**: Built with Tauri for optimal speed and efficiency

## How to Use

### Keyboard Shortcuts

- **Command/Meta + `** (backtick): Press and hold to record. Release to process and send to AI
- **Alt + `** (backtick): Open the AI interaction window directly for text-based interaction

### Windows

- **Main Window**: App control center
- **Recorder Window**: Appears when recording is active with visual feedback
- **AI Interaction Window**: Displays AI responses and allows continued conversation

## Development

This application is built with Tauri, React, and TypeScript.

### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Build and Run

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```
