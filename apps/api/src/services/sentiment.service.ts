import type { PrismaClient } from "@aura/db";

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
  overall: "positive" | "negative" | "neutral" | "mixed";
}

// Simple keyword-based sentiment analysis
// (Production would use Claude or a dedicated model)
const POSITIVE_WORDS = new Set([
  "great",
  "good",
  "awesome",
  "amazing",
  "happy",
  "excited",
  "love",
  "wonderful",
  "fantastic",
  "excellent",
  "perfect",
  "grateful",
  "thankful",
  "proud",
  "accomplished",
  "progress",
  "better",
  "improved",
  "success",
  "yes",
  "yeah",
  "yep",
  "absolutely",
  "definitely",
  "thanks",
  "thank",
]);

const NEGATIVE_WORDS = new Set([
  "bad",
  "terrible",
  "awful",
  "horrible",
  "sad",
  "depressed",
  "angry",
  "frustrated",
  "stressed",
  "overwhelmed",
  "failed",
  "failing",
  "worse",
  "can't",
  "impossible",
  "hopeless",
  "struggling",
  "stuck",
  "tired",
  "exhausted",
  "anxious",
  "worried",
  "scared",
  "afraid",
  "hate",
]);

export function analyzeSentiment(text: string): SentimentScore {
  const words = text.toLowerCase().split(/\s+/);
  const total = words.length || 1;

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    const cleaned = word.replace(/[^a-z']/g, "");
    if (POSITIVE_WORDS.has(cleaned)) positiveCount++;
    if (NEGATIVE_WORDS.has(cleaned)) negativeCount++;
  }

  const positive = positiveCount / total;
  const negative = negativeCount / total;
  const neutral = 1 - positive - negative;

  let overall: SentimentScore["overall"];
  if (positive > negative * 1.5) overall = "positive";
  else if (negative > positive * 1.5) overall = "negative";
  else if (positiveCount > 0 && negativeCount > 0) overall = "mixed";
  else overall = "neutral";

  return { positive, negative, neutral, overall };
}

export class SentimentTracker {
  constructor(private prisma: PrismaClient) {}

  async trackMessageSentiment(
    userId: string,
    conversationId: string,
    content: string
  ): Promise<SentimentScore> {
    const score = analyzeSentiment(content);

    // Store as a key fact memory if strongly negative
    if (score.overall === "negative" && score.negative > 0.15) {
      const today = new Date().toISOString().split("T")[0];
      const existing = await this.prisma.memorySummary.findFirst({
        where: {
          userId,
          type: "KEY_FACT",
          content: { startsWith: `[mood:${today}]` },
        },
      });

      if (!existing) {
        await this.prisma.memorySummary.create({
          data: {
            userId,
            type: "KEY_FACT",
            content: `[mood:${today}] User appeared to be feeling down or stressed.`,
          },
        });
      }
    }

    return score;
  }
}
