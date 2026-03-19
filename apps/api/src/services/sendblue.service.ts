import type { PrismaClient } from "@aura/db";
import { randomBytes } from "node:crypto";

const SENDBLUE_API = "https://api.sendblue.co/api";

// A bcrypt-shaped hash that will never match any real password
const SMS_PLACEHOLDER_HASH = "$2b$12$000000000000000000000000000000000000000000000000000000";

export class SendblueService {
  private apiKey: string;
  private apiSecret: string;
  private fromNumber: string;

  constructor(private prisma: PrismaClient) {
    const apiKey = process.env.SENDBLUE_API_KEY;
    const apiSecret = process.env.SENDBLUE_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("Missing SENDBLUE_API_KEY or SENDBLUE_API_SECRET");
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.fromNumber = process.env.SENDBLUE_FROM_NUMBER ?? "+13054098546";
  }

  async sendMessage(to: string, content: string): Promise<string> {
    const res = await fetch(`${SENDBLUE_API}/send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "sb-api-key-id": this.apiKey,
        "sb-api-secret-key": this.apiSecret,
      },
      body: JSON.stringify({
        number: to,
        content,
        from_number: this.fromNumber,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sendblue send failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { message_id?: string };
    return data.message_id ?? "sent";
  }

  async getOrCreateUserByPhone(phone: string): Promise<{ userId: string; plan: string }> {
    const normalized = phone.startsWith("+") ? phone : `+${phone}`;

    let user = await this.prisma.user.findUnique({
      where: { phone: normalized },
      select: { id: true, plan: true },
    });

    if (!user) {
      const uniqueId = randomBytes(8).toString("hex");
      user = await this.prisma.user.create({
        data: {
          phone: normalized,
          email: `sms_${uniqueId}@aura.sms`,
          passwordHash: SMS_PLACEHOLDER_HASH,
          status: "ACTIVE",
          plan: "FREE",
        },
        select: { id: true, plan: true },
      });

      await this.prisma.auraProfile.create({
        data: { userId: user.id, mode: "GLOW" },
      });
    }

    return { userId: user.id, plan: user.plan };
  }
}
