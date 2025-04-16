export const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// API endpoint paths
export const API_ENDPOINTS = {
  transcription: `${GROQ_BASE_URL}/audio/transcriptions`,
  chatCompletion: `${GROQ_BASE_URL}/chat/completions`,
};

// Chat models
export const CHAT_MODELS = {
  llama3: "deepseek-r1-distill-llama-70b",
};

// Transcription models
export const TRANSCRIPTION_MODELS = {
  whisperLargeV3: "distil-whisper-large-v3-en",
};

// Default system prompt for chat
export const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Respond concisely.";

export const DEFAULT_IMAGE_EXTRACT_SYSTEM_PROMPT =
  "You are an expert screen text extractor. Your input is an image full screenshot of users screen. Your ONLY task is to identify and output the exact text from the image that is directly relevant and would be relevant for users followup question. \nRules:1. Output ONLY the relevant items found in the image. 2. Clearly differenticate between items/texts in different windows in the screen.3. Do NOT add any irrelevant explanations, summaries 4. Separate multiple contents them with a xml tag (example: <window1name>Text inside window text</window1name>).5. If there is not text on the screen or in a window then output details about the window whatever you see there. Your output will be used by another system to generate the final answer. 6. You might also find a chat window on the screen that user uses to communicate to our own AI app, Do not include contents of that chat window in the output, Its not relevant. Accuracy and strict adherence to outputting *only* the relevant text are critical.";
