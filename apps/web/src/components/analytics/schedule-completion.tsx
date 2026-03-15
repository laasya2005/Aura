"use client";

import { formatEnum } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface ScheduleStat {
  scheduleId: string;
  type: string;
  channel: string;
  label: string | null;
  total: number;
  completed: number;
  missed: number;
  pending: number;
  completionRate: number;
}

interface ScheduleCompletionProps {
  overallRate: number;
  totalSent: number;
  totalCompleted: number;
  totalMissed: number;
  schedules: ScheduleStat[];
  hideOverall?: boolean;
}

export function ScheduleCompletion({
  overallRate,
  totalSent,
  totalCompleted,
  totalMissed,
  schedules,
  hideOverall,
}: ScheduleCompletionProps) {
  if (totalSent === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[15px] text-muted-foreground">No scheduled activities yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall completion bar */}
      {!hideOverall && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[15px]">
            <span className="text-muted-foreground">Overall completion</span>
            <span className="font-bold">{overallRate}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-accent/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${overallRate}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {totalCompleted} completed
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive" /> {totalMissed} missed
            </span>
            {totalSent - totalCompleted - totalMissed > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {totalSent - totalCompleted - totalMissed} pending
              </span>
            )}
          </div>
        </div>
      )}

      {/* Per-schedule breakdown */}
      <div className="space-y-2">
        {schedules.map((s) => (
          <div
            key={s.scheduleId}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 -mx-3 hover:bg-accent transition-all duration-200"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-medium truncate">{s.label ?? formatEnum(s.type)}</p>
              <p className="text-[13px] text-muted-foreground">
                {formatEnum(s.channel)} &middot; {s.completed}/{s.total} done
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <div className="w-16 h-1.5 rounded-full bg-accent/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${s.completionRate}%` }}
                />
              </div>
              <span className="text-[13px] font-bold tabular-nums w-8 text-right">
                {s.completionRate}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
