import { z } from "zod";
import { phoneSchema } from "../security/sanitize.js";

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
