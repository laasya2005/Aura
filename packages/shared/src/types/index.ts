export type Plan = "FREE" | "PRO" | "ELITE";

export type AuraMode = "GLOW" | "FLAME" | "MIRROR" | "TIDE" | "VOLT" | "CUSTOM";

export type Channel = "WEB" | "SMS";

export type GoalCategory =
  | "FITNESS"
  | "MINDFULNESS"
  | "PRODUCTIVITY"
  | "LEARNING"
  | "SOCIAL"
  | "HEALTH"
  | "FINANCE"
  | "CREATIVE"
  | "CUSTOM";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
