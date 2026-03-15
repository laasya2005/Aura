export interface TtsResult {
  audioUrl: string;
  durationMs: number;
}

// Voice IDs mapped to Aura personality modes
const MODE_VOICE_MAP: Record<string, string> = {
  GLOW: "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, friendly
  FLAME: "VR6AewLTigWG4xSOukaG", // Arnold - bold, energetic
  MIRROR: "pNInz6obpgDQGcFmaJgB", // Adam - thoughtful, measured
  TIDE: "EXAVITQu4vr4xnSDxMaL", // Bella - calm, serene
  VOLT: "MF3mGyEYCl7XYWbV9V6O", // Elli - energetic, upbeat
};

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY must be set");
  return key;
}

export function getVoiceForMode(mode: string, customVoiceId?: string | null): string {
  if (customVoiceId) return customVoiceId;
  return MODE_VOICE_MAP[mode] ?? DEFAULT_VOICE_ID;
}

export async function textToSpeech(
  text: string,
  voiceId: string,
  options?: {
    stability?: number;
    similarityBoost?: number;
    modelId?: string;
  }
): Promise<Buffer> {
  const apiKey = getApiKey();
  const modelId = options?.modelId ?? "eleven_monolingual_v1";

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: options?.stability ?? 0.5,
        similarity_boost: options?.similarityBoost ?? 0.75,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
