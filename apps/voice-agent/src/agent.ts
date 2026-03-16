import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV !== "production") {
  const { config } = await import("dotenv");
  const { resolve, dirname } = await import("path");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  config({ path: resolve(__dirname, "../../..", ".env") });
}

import {
  type JobContext,
  type JobProcess,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  pipeline,
} from "@livekit/agents";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { buildVoiceSystemPrompt, getVoiceIdForUser } from "./context-loader.js";
import { saveTranscript, type TranscriptEntry } from "./transcript-saver.js";

const { PrismaClient } = await import("@aura/db");
const prisma = new PrismaClient();

const DEFAULT_VOICE_ID = "cgSgspJ2msm6clMCkdW9"; // Jessica

interface RoomMetadata {
  userId: string;
  voiceId?: string;
  auraMode?: string;
  scheduleLabel?: string | null;
  scheduleId?: string | null;
  firstName?: string | null;
}

function parseRoomMetadata(metadata: string | undefined): RoomMetadata | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as RoomMetadata;
  } catch {
    console.error("[voice-agent] Failed to parse room metadata");
    return null;
  }
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    const vad = ctx.proc.userData.vad! as silero.VAD;

    // ctx.room.metadata is undefined before connect; read from the job's room info
    const rawMetadata = ctx.job.room?.metadata ?? ctx.room.metadata;
    const metadata = parseRoomMetadata(rawMetadata);
    const userId = metadata?.userId;

    let systemPrompt: string;
    let voiceId: string;

    if (userId) {
      try {
        const [prompt, vid] = await Promise.all([
          buildVoiceSystemPrompt(prisma, userId),
          metadata?.voiceId ? Promise.resolve(metadata.voiceId) : getVoiceIdForUser(prisma, userId),
        ]);
        systemPrompt = prompt;
        voiceId = vid;
      } catch (err) {
        console.error("[voice-agent] Failed to load user context, using defaults:", err);
        systemPrompt =
          "You are Aura, a friendly AI companion on a phone call. Keep responses short and natural.";
        voiceId = DEFAULT_VOICE_ID;
      }
    } else {
      systemPrompt =
        "You are Aura, a friendly AI companion on a phone call. Keep responses short and natural.";
      voiceId = DEFAULT_VOICE_ID;
    }

    // Get schedule label — from metadata or fetch from DB
    let scheduleLabel = metadata?.scheduleLabel;
    const firstName = metadata?.firstName;

    if (!scheduleLabel && metadata?.scheduleId) {
      try {
        const schedule = await prisma.schedule.findUnique({
          where: { id: metadata.scheduleId },
          select: { metadata: true },
        });
        const scheduleMeta = schedule?.metadata as { label?: string } | null;
        scheduleLabel = scheduleMeta?.label ?? null;
      } catch {
        // DB fetch failed, proceed without schedule label
      }
    }

    if (scheduleLabel) {
      systemPrompt += `\n\nCALL CONTEXT:\nYou called ${firstName ?? "the user"} to check in about "${scheduleLabel}". This is the reason for the call. Throughout the conversation, keep the focus on "${scheduleLabel}" — ask how it went, encourage them, celebrate progress. Talk about it like a friend who genuinely cares about this specific thing.`;
    }

    const initialContext = new llm.ChatContext().append({
      role: llm.ChatRole.SYSTEM,
      text: systemPrompt,
    });

    await ctx.connect();
    console.log("[voice-agent] Connected, waiting for participant...");
    const participant = await ctx.waitForParticipant();
    console.log(`[voice-agent] Participant joined: ${participant.identity}`);

    const agent = new pipeline.VoicePipelineAgent(
      vad,
      new deepgram.STT(),
      new openai.LLM({ model: "gpt-4o-mini" }),
      new elevenlabs.TTS({
        voice: { id: voiceId, name: "Aura", category: "premade" },
      }),
      {
        chatCtx: initialContext,
        // Require longer speech before interrupting (avoid false interrupts)
        interruptSpeechDuration: 0.8,
        interruptMinWords: 3,
        // Wait a bit longer before treating silence as end-of-turn
        minEndpointingDelay: 0.8,
      }
    );

    const transcript: TranscriptEntry[] = [];

    agent.on(pipeline.VPAEvent.USER_SPEECH_COMMITTED, (msg: llm.ChatMessage) => {
      const text = typeof msg.content === "string" ? msg.content : "";
      if (text) transcript.push({ role: "USER", content: text, timestamp: new Date() });
    });

    agent.on(pipeline.VPAEvent.AGENT_SPEECH_COMMITTED, (msg: llm.ChatMessage) => {
      const text = typeof msg.content === "string" ? msg.content : "";
      if (text) transcript.push({ role: "ASSISTANT", content: text, timestamp: new Date() });
    });

    ctx.room.on("participantDisconnected", async () => {
      console.log("[voice-agent] Participant disconnected, saving transcript...");
      if (userId && transcript.length > 0) {
        try {
          const result = await saveTranscript(prisma, userId, transcript);
          console.log(
            `[voice-agent] Transcript saved: ${result.messageCount} messages (${result.conversationId})`
          );
        } catch (err) {
          console.error("[voice-agent] Failed to save transcript:", err);
        }
      }
    });

    agent.start(ctx.room, participant);

    // Speak greeting immediately — agent.say() sends audio directly via TTS
    // Don't allow interruption during the greeting so it completes
    const name = firstName ?? "there";
    let greeting: string;
    if (scheduleLabel) {
      greeting = `Hey ${name}! It's Aura. I'm calling about your ${scheduleLabel}. How did that go today?`;
    } else {
      greeting = `Hey ${name}! It's Aura. Just wanted to check in, how's your day going?`;
    }

    await agent.say(greeting, false);
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url), agentName: "aura-voice" }));
