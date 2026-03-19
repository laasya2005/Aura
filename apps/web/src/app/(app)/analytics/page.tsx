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
  engagedToday: boolean;
}

interface CalendarDay {
  date: string;
  count: number;
  channels: string[];
}

interface EngagementDataPoint {
  date: string;
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

/* Activity Ring (Apple Watch style) */
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

/* Single bar chart (no stacked channels) */
function MiniBarChart({ data }: { data: EngagementDataPoint[] }) {
  const maxTotal = Math.max(1, ...data.map((d) => d.total));

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[15px] text-muted-foreground">No engagement data yet.</p>
      </div>
    );
  }

  const recent = data.slice(-14);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-[6px] h-[140px]">
        {recent.map((day) => {
          const h = (day.total / maxTotal) * 100;
          const isToday = new Date(day.date).toDateString() === new Date().toDateString();

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col justify-end items-center gap-0 group relative"
              style={{ height: "100%" }}
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                  <p className="text-[12px] font-medium">
                    {day.total} check-in{day.total !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full flex flex-col justify-end items-stretch flex-1">
                {day.total > 0 ? (
                  <div
                    className="w-full rounded-[4px] bg-emerald-500/80 transition-all duration-300"
                    style={{ height: `${h}%`, minHeight: 3 }}
                  />
                ) : (
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
          <span className="text-[13px] text-muted-foreground">Check-ins</span>
        </div>
      </div>
    </div>
  );
}

/* Page */
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
        <p className="text-base text-muted-foreground mt-1">Your engagement overview.</p>
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
              <span className="text-[40px] sm:text-[64px] font-bold tracking-tighter leading-none">
                {summary.currentStreak}
              </span>
              <span className="text-[22px] text-muted-foreground font-medium">day streak</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 sm:gap-8">
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
                <div className="sm:hidden">
                  <ActivityRing value={scheduleStats.overallRate} size={120} />
                </div>
                <div className="hidden sm:block">
                  <ActivityRing value={scheduleStats.overallRate} size={160} />
                </div>
                <p className="text-[14px] text-muted-foreground mt-4">
                  {scheduleStats.totalCompleted} of {scheduleStats.totalSent} check-ins completed
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="sm:hidden">
                  <ActivityRing value={0} size={120} />
                </div>
                <div className="hidden sm:block">
                  <ActivityRing value={0} />
                </div>
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

      {/* Recent engagement bars */}
      <Card>
        <CardHeader>
          <CardTitle>Last 2 Weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBarChart data={engagementData} />
        </CardContent>
      </Card>

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
