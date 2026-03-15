export interface TranscriptionResult {
  text: string;
  confidence: number;
  durationSeconds: number;
}

function getApiKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY must be set");
  return key;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = "audio/wav"
): Promise<TranscriptionResult> {
  const apiKey = getApiKey();

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": mimeType,
      },
      body: audioBuffer,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram STT failed (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
          confidence?: number;
        }>;
      }>;
    };
    metadata?: { duration?: number };
  };

  const alt = data.results?.channels?.[0]?.alternatives?.[0];

  return {
    text: alt?.transcript ?? "",
    confidence: alt?.confidence ?? 0,
    durationSeconds: data.metadata?.duration ?? 0,
  };
}

export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  const apiKey = getApiKey();

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: audioUrl }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram STT failed (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{
          transcript?: string;
          confidence?: number;
        }>;
      }>;
    };
    metadata?: { duration?: number };
  };

  const alt = data.results?.channels?.[0]?.alternatives?.[0];

  return {
    text: alt?.transcript ?? "",
    confidence: alt?.confidence ?? 0,
    durationSeconds: data.metadata?.duration ?? 0,
  };
}
