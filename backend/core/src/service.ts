import { openai, createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { streamText, CoreMessage, StreamTextResult } from "ai"; // Import StreamTextResult
import { z } from "zod";
import { registry } from "./registry"; // Import the registry

// Configuration (will be moved to separate config.ts)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const CHAT_MODELS = {
  llama3: "llama-3.3-70b-versatile",
};

const TRANSCRIPTION_MODELS = {
  whisperLargeV3: "distil-whisper-large-v3-en",
};

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant. Respond concisely.";

// Configure OpenAI client to use Groq API
const groqClient = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_BASE_URL,
});

/**
 * Transcribes audio using OpenAI/Groq API
 */
export const transcribeAudio = async (audioFile: File): Promise<string> => {
  try {
    const response = await groqClient.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIPTION_MODELS.whisperLargeV3,
    });
    return response.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

/**
 * Generates chat completion from text
 */
export const generateChatCompletion = async (text: string): Promise<string> => {
  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const completion = await groqClient.chat.completions.create({
      model: CHAT_MODELS.llama3,
      messages: [
        {
          role: "system",
          content: DEFAULT_SYSTEM_PROMPT,
        },
        { role: "user", content: text },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("Chat completion error:", error);
    throw new Error(
      `Chat failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Generates a streaming chat completion using @ai-sdk/openai provider.
 * Returns the full StreamTextResult object.
 */
export const streamChatCompletion = async (
  messages: CoreMessage[],
  system?: string,
  tools?: Record<string, { parameters: any }>,
  modelId?: string
): Promise<StreamTextResult<any, any>> => {
  try {
    const defaultModelId = "groq:llama-3.3-70b-versatile";
    const selectedModelId = modelId || defaultModelId;

    const result = streamText({
      model: registry.languageModel(selectedModelId as any),
      messages,
      system: system || DEFAULT_SYSTEM_PROMPT,
      tools,
      temperature: 0.5,
      maxTokens: 4000,
    });

    return result;
  } catch (error) {
    console.error("Streaming chat completion error:", error);
    throw new Error(
      `Streaming chat failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

// Schema for request validation
export const TranscriptionSchema = z.object({
  audio: z.instanceof(File),
});

export const ChatCompletionSchema = z.object({
  text: z.string(), // Keep for potential non-streaming use? Or remove if fully switching.
});

// Schema for streaming chat request
export const StreamChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system", "tool"]), // Adjust roles as needed
      content: z.union([
        z.string(),
        z.array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
            // Other content type fields can be added as needed
          })
        ),
      ]),
      // Add other potential fields like 'tool_calls', 'tool_call_id' if using tools
    })
  ),
  system: z.string().optional(),
  tools: z.any().optional(), // Accept any tools format to handle different client implementations
  modelId: z.string().optional(), // Add optional modelId field
});
