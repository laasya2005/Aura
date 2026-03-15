import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  channel: z.enum(["WHATSAPP", "VOICE"]).optional().default("WHATSAPP"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
