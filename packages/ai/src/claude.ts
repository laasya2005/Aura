import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY must be set");
    }
    client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
  }
  return client;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30_000;

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const openai = getClient();
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;

  let lastError: Error | null = null;

  // Build messages array with optional system prompt
  const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (options.systemPrompt) {
    apiMessages.push({ role: "system", content: options.systemPrompt });
  }
  for (const m of messages) {
    apiMessages.push({ role: m.role, content: m.content });
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: apiMessages,
      });

      const choice = response.choices[0];
      return {
        content: choice?.message?.content ?? "",
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        stopReason: choice?.finish_reason ?? null,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth or validation errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401 || error.status === 400) {
          throw lastError;
        }
        // Retry on 429 (rate limit) and 5xx (server errors)
        if (error.status === 429 || (error.status && error.status >= 500)) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("OpenAI API request failed after retries");
}

// For testing: allow injecting a mock client
export function _setClient(mockClient: OpenAI | null): void {
  client = mockClient;
}
