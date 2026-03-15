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

function getVerifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID must be set");
  }
  return sid;
}

export async function sendOtp(phone: string): Promise<{ success: boolean; sid?: string }> {
  try {
    const verification = await getClient()
      .verify.v2.services(getVerifyServiceSid())
      .verifications.create({ to: phone, channel: "sms" });

    return { success: true, sid: verification.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    throw new Error(`Twilio OTP send failed: ${message}`);
  }
}

export async function checkOtp(
  phone: string,
  code: string
): Promise<{ valid: boolean; status: string }> {
  try {
    const check = await getClient()
      .verify.v2.services(getVerifyServiceSid())
      .verificationChecks.create({ to: phone, code });

    return { valid: check.status === "approved", status: check.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify OTP";
    throw new Error(`Twilio OTP check failed: ${message}`);
  }
}

// For testing: allow injecting a mock client
export function _setClient(mockClient: ReturnType<typeof Twilio> | null): void {
  client = mockClient;
}
