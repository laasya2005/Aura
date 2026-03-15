import { Queue, type ConnectionOptions } from "bullmq";

export const QUEUE_NAMES = {
  MORNING_TEXT: "morning-text",
  CHECK_IN: "check-in",
  EVENING_RECAP: "evening-recap",
  VOICE_CALL: "voice-call",
  MEMORY_SUMMARY: "memory-summary",
  STREAK_UPDATE: "streak-update",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

let connection: ConnectionOptions | null = null;
const queues = new Map<string, Queue>();

export function getConnection(): ConnectionOptions {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    const url = new URL(redisUrl);
    connection = {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      ...(url.password ? { password: url.password } : {}),
    };
  }
  return connection;
}

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    queues.set(name, new Queue(name, { connection: getConnection() }));
  }
  return queues.get(name)!;
}

export async function closeAllQueues(): Promise<void> {
  const promises = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(promises);
  queues.clear();
}

// Job data types
export interface MorningTextJobData {
  userId: string;
  scheduleId: string;
}

export interface CheckInJobData {
  userId: string;
  scheduleId: string;
}

export interface EveningRecapJobData {
  userId: string;
  scheduleId: string;
}

export interface VoiceCallJobData {
  userId: string;
  scheduleId: string;
}

export interface MemorySummaryJobData {
  userId: string;
  conversationId?: string;
  type: "daily" | "weekly";
}

export interface StreakUpdateJobData {
  userId: string;
  goalId: string;
}
