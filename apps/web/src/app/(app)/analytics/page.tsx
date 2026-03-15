"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { StreakCalendar } from "@/components/analytics/streak-calendar";
import { ScheduleCompletion } from "@/components/analytics/schedule-completion";
import { cn } from "@/lib/utils";

interface Summary {
  engagementDays30d: number;
  currentStreak: number;
  longestStreak: number;
  weeklyAvg: number;
  channelBreakdown: Record<string, number>;
  engagedToday: boolean;
}

interface CalendarDay {
  date: string;
  count: number;
  channels: string[];
}

interface EngagementDataPoint {
  date: string;
  WHATSAPP: number;
  VOICE: number;
  total: number;
}

interface ScheduleStats {
  overallRate: number;
  totalSent: number;
  totalCompleted: number;
  totalMissed: number;
  schedules: Array<{
    scheduleId: string;
    type: string;
    channel: string;
    label: string | null;
    total: number;
    completed: number;
    missed: number;
    pending: number;
    completionRate: number;
  }>;
}

/* ── Activity Ring (Apple Watch style) ── */
function ActivityRing({
  value,
  size = 160,
  strokeWidth = 14,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[36px] font-bold tracking-tight">{value}%</span>
        <span className="text-[13px] text-muted-foreground -mt-1">completed</span>
      </div>
    </div>
  );
}

/* ── Minimal bar chart (no axes, no grid, no dots) ── */
function MiniBarChart({ data }: { data: EngagementDataPoint[] }) {
  const maxTotal = Math.max(1, ...data.map((d) => d.total));

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[15px] text-muted-foreground">No engagement data yet.</p>
      </div>
    );
  }

  // Show only last 14 days for cleanliness
  const recent = data.slice(-14);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-[6px] h-[140px]">
        {recent.map((day) => {
          const whatsappH = (day.WHATSAPP / maxTotal) * 100;
          const voiceH = (day.VOICE / maxTotal) * 100;
          const isToday =
            new Date(day.date).toDateString() === new Date().toDateString();

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col justify-end items-center gap-0 group relative"
              style={{ height: "100%" }}
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                  <p className="text-[12px] font-medium">{day.total} check-in{day.total !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Stacked bars */}
              <div className="w-full flex flex-col justify-end items-stretch gap-[1px] flex-1">
                {day.VOICE > 0 && (
                  <div
                    className="w-full rounded-t-[4px] bg-blue-500/80 transition-all duration-300"
                    style={{ height: `${voiceH}%`, minHeight: day.VOICE > 0 ? 3 : 0 }}
                  />
                )}
                {day.WHATSAPP > 0 && (
                  <div
                    className={cn(
                      "w-full transition-all duration-300",
                      day.VOICE > 0 ? "rounded-b-[4px]" : "rounded-[4px]",
                      "bg-emerald-500/80"
                    )}
                    style={{ height: `${whatsappH}%`, minHeight: day.WHATSAPP > 0 ? 3 : 0 }}
                  />
                )}
                {day.total === 0 && (
                  <div className="w-full rounded-[4px] bg-border/40 h-[3px]" />
                )}
              </div>

              {/* Day label */}
              <span
                className={cn(
                  "text-[10px] mt-1.5",
                  isToday ? "text-foreground font-semibold" : "text-muted-foreground/60"
                )}
              >
                {new Date(day.date).toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-[13px] text-muted-foreground">WhatsApp</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500/80" />
          <span className="text-[13px] text-muted-foreground">Voice</span>
        </div>
      </div>
    </div>
  );
}

/* ── Channel bars (replaces pie chart) ── */
function ChannelBars({ data }: { data: Record<string, number> }) {
  const channels = Object.entries(data).filter(
    ([ch]) => ch === "WHATSAPP" || ch === "VOICE"
  );
  const total = channels.reduce((a, [, b]) => a + b, 0);

  if (total === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-[15px] text-muted-foreground">No engagement data yet.</p>
      </div>
    );
  }

  const colors: Record<string, string> = {
    WHATSAPP: "bg-emerald-500",
    VOICE: "bg-blue-500",
  };

  return (
    <div className="space-y-5">
      {/* Combined bar */}
      <div className="h-3 w-full rounded-full overflow-hidden flex">
        {channels.map(([channel, count]) => (
          <div
            key={channel}
            className={cn("h-full transition-all duration-500", colors[channel])}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Channel rows */}
      {channels.map(([channel, count]) => (
        <div key={channel} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-3 w-3 rounded-full", colors[channel])} />
            <span className="text-[16px] font-medium">{channel === "WHATSAPP" ? "WhatsApp" : "Voice"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[16px] font-bold tabular-nums">{count}</span>
            <span className="text-[14px] text-muted-foreground tabular-nums w-12 text-right">
              {Math.round((count / total) * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function AnalyticsPage() {
  useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [engagementData, setEngagementData] = useState<EngagementDataPoint[]>([]);
  const [scheduleStats, setScheduleStats] = useState<ScheduleStats | null>(null);

  useEffect(() => {
    apiFetch<Summary>("/analytics/summary").then((res) => {
      if (res.success && res.data) setSummary(res.data);
    });

    apiFetch<{ calendar: CalendarDay[] }>("/analytics/streaks").then((res) => {
      if (res.success && res.data) setCalendar(res.data.calendar);
    });

    apiFetch<ScheduleStats>("/analytics/schedules").then((res) => {
      if (res.success && res.data) setScheduleStats(res.data);
    });

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    apiFetch<EngagementDataPoint[]>(
      `/analytics/engagement?period=daily&start=${start.toISOString()}&end=${end.toISOString()}`
    ).then((res) => {
      if (res.success && res.data) setEngagementData(res.data);
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Analytics</h1>
        <p className="text-base text-muted-foreground mt-1">
          Your engagement overview.
        </p>
      </div>

      {/* Hero: Streak + Completion ring side by side */}
      {summary && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Streak hero */}
          <div className="rounded-[20px] border border-border/50 bg-card/80 backdrop-blur-xl p-8">
            <div className="flex items-center gap-2 mb-6">
              {summary.engagedToday && (
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span className="text-[14px] text-muted-foreground font-medium">
                {summary.engagedToday ? "Active today" : "Streak"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[64px] font-bold tracking-tighter leading-none">
                {summary.currentStreak}
              </span>
              <span className="text-[22px] text-muted-foreground font-medium">
                day streak
              </span>
            </div>

            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-[28px] font-bold tracking-tight">{summary.longestStreak}</p>
                <p className="text-[14px] text-muted-foreground">best streak</p>
              </div>
              <div>
                <p className="text-[28px] font-bold tracking-tight">{summary.engagementDays30d}</p>
                <p className="text-[14px] text-muted-foreground">active last 30d</p>
              </div>
              <div>
                <p className="text-[28px] font-bold tracking-tight">{summary.weeklyAvg}</p>
                <p className="text-[14px] text-muted-foreground">days/week avg</p>
              </div>
            </div>
          </div>

          {/* Completion ring */}
          <div className="rounded-[20px] border border-border/50 bg-card/80 backdrop-blur-xl p-8 flex flex-col items-center justify-center">
            {scheduleStats && scheduleStats.totalSent > 0 ? (
              <>
                <ActivityRing value={scheduleStats.overallRate} />
                <p className="text-[14px] text-muted-foreground mt-4">
                  {scheduleStats.totalCompleted} of {scheduleStats.totalSent} check-ins completed
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <ActivityRing value={0} />
                <p className="text-[15px] text-muted-foreground mt-4">No check-ins yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <StreakCalendar data={calendar} />
        </CardContent>
      </Card>

      {/* Two-column: Recent engagement bars + Channels */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Last 2 Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart data={engagementData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
          </CardHeader>
          <CardContent>
            {summary ? (
              <ChannelBars data={summary.channelBreakdown} />
            ) : (
              <div className="py-8 text-center">
                <p className="text-[15px] text-muted-foreground">No data yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule breakdown (only if data) */}
      {scheduleStats && scheduleStats.totalSent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleCompletion {...scheduleStats} hideOverall />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
