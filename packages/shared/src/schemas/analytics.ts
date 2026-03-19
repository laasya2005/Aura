import { z } from "zod";

export const engagementStatsSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export const streakCalendarSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export type EngagementStatsInput = z.infer<typeof engagementStatsSchema>;
export type StreakCalendarInput = z.infer<typeof streakCalendarSchema>;
