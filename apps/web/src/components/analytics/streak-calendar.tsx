"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface CalendarDay {
  date: string;
  count: number;
  channels: string[];
}

interface StreakCalendarProps {
  data: CalendarDay[];
}

export function StreakCalendar({ data }: StreakCalendarProps) {
  const { grid, months } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 90);

    // Build a map for quick lookup
    const dayMap = new Map(data.map((d) => [d.date, d]));

    // Generate 91 days (13 weeks)
    const days: Array<{ date: string; day: CalendarDay | null; dayOfWeek: number }> = [];
    const d = new Date(start);
    while (d <= today) {
      const key = d.toISOString().split("T")[0]!;
      days.push({
        date: key,
        day: dayMap.get(key) ?? null,
        dayOfWeek: d.getDay(),
      });
      d.setDate(d.getDate() + 1);
    }

    // Pad the first week so it starts on Sunday
    const firstDow = days[0]?.dayOfWeek ?? 0;
    const padded = Array(firstDow).fill(null).concat(days);

    // Group into weeks (columns)
    const weeks: Array<Array<(typeof days)[0] | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }

    // Pad the last week
    const lastWeek = weeks[weeks.length - 1];
    if (lastWeek) {
      while (lastWeek.length < 7) lastWeek.push(null);
    }

    // Get month labels
    const monthLabels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const firstDay = weeks[w]?.find((d) => d !== null);
      if (firstDay) {
        const month = new Date(firstDay.date).getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            label: new Date(firstDay.date).toLocaleDateString("en-US", { month: "short" }),
            col: w,
          });
          lastMonth = month;
        }
      }
    }

    return { grid: weeks, months: monthLabels };
  }, [data]);

  const maxCount = Math.max(1, ...data.map((d) => d.count));

  function getIntensity(count: number): string {
    if (count === 0) return "bg-accent/50";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "bg-emerald-300/60 dark:bg-emerald-800/60";
    if (ratio <= 0.5) return "bg-emerald-400/70 dark:bg-emerald-700/70";
    if (ratio <= 0.75) return "bg-emerald-500/80 dark:bg-emerald-600/80";
    return "bg-emerald-600 dark:bg-emerald-500";
  }

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1.5">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[14px] w-7 text-[11px] text-muted-foreground leading-[14px]">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1">
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: 0 }}>
            {months.map((m, i) => (
              <span
                key={i}
                className="text-[11px] text-muted-foreground"
                style={{
                  marginLeft: i === 0 ? `${m.col * 15}px` : `${(m.col - (months[i - 1]?.col ?? 0) - 1) * 15}px`,
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0.5">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((cell, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={cn(
                      "h-[13px] w-[13px] rounded-sm transition-colors",
                      cell ? getIntensity(cell.day?.count ?? 0) : "bg-transparent"
                    )}
                    title={
                      cell
                        ? `${cell.date}: ${cell.day?.count ?? 0} engagement${(cell.day?.count ?? 0) !== 1 ? "s" : ""}${cell.day?.channels?.length ? ` (${cell.day.channels.join(", ")})` : ""}`
                        : ""
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <span>Less</span>
        <div className="h-[11px] w-[11px] rounded-sm bg-accent/50" />
        <div className="h-[11px] w-[11px] rounded-sm bg-emerald-300/60 dark:bg-emerald-800/60" />
        <div className="h-[11px] w-[11px] rounded-sm bg-emerald-400/70 dark:bg-emerald-700/70" />
        <div className="h-[11px] w-[11px] rounded-sm bg-emerald-500/80 dark:bg-emerald-600/80" />
        <div className="h-[11px] w-[11px] rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}
