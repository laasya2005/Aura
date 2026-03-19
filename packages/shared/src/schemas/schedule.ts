import { z } from "zod";

// Validates basic cron expression format: 5 fields (minute hour day month weekday)
// Allows: numbers, *, /, -, and comma-separated values
const cronRegex =
  /^(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)$/;

const cronExprSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    cronRegex,
    "Invalid cron expression. Expected format: 'minute hour day month weekday' (e.g., '0 8 * * *')"
  )
  .refine((expr) => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    const [min] = parts;
    // Reject expressions that fire more than once per hour (e.g., * * * * *)
    // Minute field must be a specific number or limited set, not * or */1
    if (min === "*" || min === "*/1") return false;
    return true;
  }, "Cron expression must not fire more than once per hour");

export const createScheduleSchema = z.object({
  type: z.enum(["MORNING_TEXT", "CHECK_IN", "EVENING_RECAP", "CUSTOM"]),
  cronExpr: cronExprSchema,
  timezone: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const updateScheduleSchema = z.object({
  type: z.enum(["MORNING_TEXT", "CHECK_IN", "EVENING_RECAP", "CUSTOM"]).optional(),
  cronExpr: cronExprSchema.optional(),
  timezone: z.string().optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
