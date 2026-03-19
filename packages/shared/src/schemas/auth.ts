import { z } from "zod";
import { emailSchema } from "../security/sanitize.js";

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  firstName: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
