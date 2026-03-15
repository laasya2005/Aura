import { chat } from "./claude.js";

// Simple embedding via hashing (production would use a dedicated embedding model)
// This provides a deterministic vector for cosine similarity search
export async function generateEmbedding(text: string): Promise<number[]> {
  // Use a simple TF-IDF-like approach with a fixed vocabulary hash
  // For production, integrate with an embedding API (e.g., Voyage, OpenAI)
  const dimension = 256;
  const embedding = new Array<number>(dimension).fill(0);

  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    // Hash word to dimension indices
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % dimension;
    embedding[idx] = (embedding[idx] ?? 0) + 1;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      embedding[i] = (embedding[i] ?? 0) / magnitude;
    }
  }

  return embedding;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function summarizeConversation(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const transcript = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  const response = await chat(
    [{ role: "user", content: `Summarize this conversation:\n\n${transcript}` }],
    {
      systemPrompt:
        "You are a summarization assistant. Create a brief, factual summary of the conversation. Focus on: key topics discussed, user's mood/state, any goals or plans mentioned, and important facts about the user. Keep it under 150 words.",
      maxTokens: 300,
    }
  );

  return response.content;
}
