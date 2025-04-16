/**
 * Type definitions for API operations
 */

// Transcription API
export interface TranscriptionRequest {
  audio: File;
  model?: string;
}

export interface TranscriptionResponse {
  text: string;
  language?: string;
}

// Chat Completion API
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  text: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  stream: ReadableStream;
}

// Image-to-Text API
export interface ImageToTextRequest {
  image: string; // Either a URL or base64 encoded image data
  prompt?: string;
  modelId?: string;
}

export interface ImageToTextResponse {
  text: string;
}

// Error types
export interface ApiError {
  message: string;
  status?: number;
  details?: string;
}
