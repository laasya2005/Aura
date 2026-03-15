import { z } from "zod";

export const createGoalSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.enum([
    "FITNESS",
    "MINDFULNESS",
    "PRODUCTIVITY",
    "LEARNING",
    "SOCIAL",
    "HEALTH",
    "FINANCE",
    "CREATIVE",
    "CUSTOM",
  ]),
  targetDate: z.string().datetime().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z
    .enum([
      "FITNESS",
      "MINDFULNESS",
      "PRODUCTIVITY",
      "LEARNING",
      "SOCIAL",
      "HEALTH",
      "FINANCE",
      "CREATIVE",
      "CUSTOM",
    ])
    .optional(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ABANDONED"]).optional(),
  targetDate: z.string().datetime().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
