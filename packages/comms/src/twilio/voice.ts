import Twilio from "twilio";

let client: ReturnType<typeof Twilio> | null = null;

function getClient(): ReturnType<typeof Twilio> {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
    }
    client = Twilio(accountSid, authToken);
  }
  return client;
}

function getFromNumber(): string {
  const num = process.env.TWILIO_PHONE_NUMBER;
  if (!num) throw new Error("TWILIO_PHONE_NUMBER must be set");
  return num;
}

export interface CallResult {
  sid: string;
  status: string;
  to: string;
}

export async function initiateCall(
  to: string,
  answerUrl: string,
  statusCallbackUrl: string
): Promise<CallResult> {
  const call = await getClient().calls.create({
    to,
    from: getFromNumber(),
    url: answerUrl,
    statusCallback: statusCallbackUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
    timeout: 30,
    machineDetection: "Enable",
  });

  return {
    sid: call.sid,
    status: call.status,
    to: call.to,
  };
}

// Generate TwiML response for voice call
export function buildTwimlSay(text: string, audioUrl?: string): string {
  if (audioUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${escapeXml(audioUrl)}</Play>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhooks/twilio/voice/input" method="POST">
    <Say>I'm listening.</Say>
  </Gather>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(text)}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/webhooks/twilio/voice/input" method="POST">
    <Say voice="Polly.Joanna">I'm listening.</Say>
  </Gather>
</Response>`;
}

export function buildTwimlHangup(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for chatting! Take care.</Say>
  <Hangup/>
</Response>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Plan-based call limits per month
export const MONTHLY_CALL_LIMITS: Record<string, number> = {
  FREE: 10,
  PRO: 30,
  ELITE: 100,
};

export function _setVoiceClient(mockClient: ReturnType<typeof Twilio> | null): void {
  client = mockClient;
}
