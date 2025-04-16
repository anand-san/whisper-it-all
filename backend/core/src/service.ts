import OpenAI from "openai";
import { streamText, CoreMessage, StreamTextResult } from "ai"; // Import StreamTextResult
import { z } from "zod";
import { registry } from "./registry"; // Import the registry
import { DEFAULT_IMAGE_EXTRACT_SYSTEM_PROMPT } from "./config";

// Configuration (will be moved to separate config.ts)
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

const CHAT_MODELS = {
  llama3: "llama-3.3-70b-versatile",
};

const VISION_MODELS = {
  llama4Scout: "meta-llama/llama-4-scout-17b-16e-instruct",
  llama3_2_11b: "llama-3.2-11b-vision-preview",
  llama3_2_90b: "llama-3.2-90b-vision-preview",
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

// Schema for image-to-text request
export const ImageToTextSchema = z.object({
  image: z.union([
    // Base64 encoded image
    z.string().refine((str) => str.startsWith("data:image/"), {
      message:
        "Image must be a base64 encoded string starting with data:image/",
    }),
    // Image URL
    z.string().url(),
  ]),
  prompt: z.string().default("What's in this image?"),
  modelId: z.string().optional(), // Optional model ID
});

/**
 * Processes image using Groq vision models to generate text description
 */
export const processImageToText = async (
  imageData: string,
  prompt: string = "What's in this image?",
  modelId?: string
): Promise<string> => {
  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    // Determine if the input is a URL or base64 data
    const isUrl = !imageData.startsWith("data:image/");

    // Create the image content object
    const imageContent = isUrl ? { url: imageData } : { url: imageData }; // For base64, we still use the url field with the data URI

    // Set up the request with the image
    const completion = await groqClient.chat.completions.create({
      model: modelId || VISION_MODELS.llama4Scout,
      messages: [
        {
          role: "system",
          content: DEFAULT_IMAGE_EXTRACT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: imageContent },
          ],
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    return completion.choices[0].message.content || "";
  } catch (error) {
    console.error("Image processing error:", error);
    throw new Error(
      `Image processing failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
