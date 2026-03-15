import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  channel: z.enum(["SMS", "WHATSAPP", "VOICE", "WEB"]).optional().default("WEB"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
