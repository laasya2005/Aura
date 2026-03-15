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
  if (!num) {
    throw new Error("TWILIO_PHONE_NUMBER must be set");
  }
  return num;
}

export interface SmsResult {
  sid: string;
  status: string;
  to: string;
}

export async function sendSms(
  to: string,
  body: string,
  statusCallbackUrl?: string
): Promise<SmsResult> {
  // Enforce SMS character limits — split if needed
  const truncated = body.length > 1600 ? body.slice(0, 1597) + "..." : body;

  const message = await getClient().messages.create({
    to,
    from: getFromNumber(),
    body: truncated,
    ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
  });

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
  };
}

// Validate Twilio webhook signature
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  return Twilio.validateRequest(authToken, signature, url, params);
}

// Format message for SMS (strip markdown, limit length)
export function formatForSms(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/#{1,6}\s/g, "") // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .trim()
    .slice(0, 1600);
}

// TCPA compliance: check STOP words
const STOP_WORDS = ["stop", "unsubscribe", "cancel", "end", "quit"];
const HELP_WORDS = ["help", "info"];

export type TcpaAction = "stop" | "help" | "none";

export function checkTcpaKeywords(message: string): TcpaAction {
  const trimmed = message.trim().toLowerCase();
  if (STOP_WORDS.includes(trimmed)) return "stop";
  if (HELP_WORDS.includes(trimmed)) return "help";
  return "none";
}

// Check quiet hours (default: 9pm - 8am in user timezone)
export function isQuietHours(timezone: string, quietStart = 21, quietEnd = 8): boolean {
  let hour: number;
  try {
    hour = parseInt(
      new Date().toLocaleString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      })
    );
  } catch {
    // Invalid timezone — fall back to UTC
    hour = new Date().getUTCHours();
  }

  if (quietStart > quietEnd) {
    // Crosses midnight: e.g., 21-8
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}

// For testing
export function _setSmsClient(mockClient: ReturnType<typeof Twilio> | null): void {
  client = mockClient;
}
