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

function getWhatsAppNumber(): string {
  const num = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!num) {
    throw new Error("TWILIO_WHATSAPP_NUMBER must be set (e.g., +14155238886)");
  }
  return num;
}

export interface WhatsAppResult {
  sid: string;
  status: string;
  to: string;
}

/**
 * Send a WhatsApp message via Twilio.
 * Twilio routes WhatsApp by prefixing numbers with "whatsapp:".
 */
export async function sendWhatsApp(
  to: string,
  body: string,
  statusCallbackUrl?: string
): Promise<WhatsAppResult> {
  // WhatsApp supports up to 4096 chars per message
  const truncated = body.length > 4096 ? body.slice(0, 4093) + "..." : body;

  const message = await getClient().messages.create({
    to: `whatsapp:${to}`,
    from: `whatsapp:${getWhatsAppNumber()}`,
    body: truncated,
    ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
  });

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
  };
}

/**
 * Send a WhatsApp template message via Twilio Content API.
 * Templates can be sent outside the 24-hour session window.
 * contentSid is the Twilio Content Template SID (e.g., HXxxxxxx).
 * contentVariables is a JSON string of template variables.
 */
export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string,
  contentVariables?: Record<string, string>,
  statusCallbackUrl?: string
): Promise<WhatsAppResult> {
  const message = await getClient().messages.create({
    to: `whatsapp:${to}`,
    from: `whatsapp:${getWhatsAppNumber()}`,
    contentSid,
    ...(contentVariables ? { contentVariables: JSON.stringify(contentVariables) } : {}),
    ...(statusCallbackUrl ? { statusCallback: statusCallbackUrl } : {}),
  });

  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
  };
}

/**
 * Try sending a WhatsApp message. If it fails (e.g., outside 24hr window),
 * returns false so the caller can handle the failure.
 */
export async function trySendWhatsApp(
  to: string,
  body: string
): Promise<{ success: boolean; result?: WhatsAppResult; error?: string }> {
  try {
    const result = await sendWhatsApp(to, body);
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Format message for WhatsApp.
 * WhatsApp supports basic formatting (*bold*, _italic_) so we preserve them.
 * We strip code blocks and links but preserve bold/italic.
 */
export function formatForWhatsApp(content: string): string {
  return content
    .replace(/#{1,6}\s/g, "*") // convert headers to bold prefix
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip link syntax, keep text
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`([^`]+)`/g, "$1") // remove inline code
    .trim()
    .slice(0, 4096);
}

// For testing
export function _setWhatsAppClient(mockClient: ReturnType<typeof Twilio> | null): void {
  client = mockClient;
}
