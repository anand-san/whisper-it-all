import { createProviderRegistry } from "ai";
import { groq } from "@ai-sdk/groq";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { deepseek } from "@ai-sdk/deepseek";
import { mistral } from "@ai-sdk/mistral";
import { google } from "@ai-sdk/google";

export const registry = createProviderRegistry({
  groq,
  anthropic,
  openai,
  deepseek,
  google,
  mistral,
});
