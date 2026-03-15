import { z } from "zod";
import { nameSchema, emailSchema, timezoneSchema } from "../security/sanitize.js";

export const updateUserSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  timezone: timezoneSchema.optional(),
});

export const consentSchema = z.object({
  type: z.enum(["SMS", "VOICE", "MARKETING", "DATA_PROCESSING"]),
  granted: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
