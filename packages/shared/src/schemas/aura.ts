import { z } from "zod";

export const updateAuraProfileSchema = z.object({
  mode: z.enum(["GLOW", "FLAME", "MIRROR", "TIDE", "VOLT", "CUSTOM"]).optional(),
  warmth: z.number().min(0).max(1).optional(),
  humor: z.number().min(0).max(1).optional(),
  directness: z.number().min(0).max(1).optional(),
  energy: z.number().min(0).max(1).optional(),
  voiceId: z.string().optional(),
});

export const tuneAuraSchema = z.object({
  instruction: z.string().min(1).max(500),
});

export type UpdateAuraProfileInput = z.infer<typeof updateAuraProfileSchema>;
export type TuneAuraInput = z.infer<typeof tuneAuraSchema>;
