"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatEnum } from "@/lib/utils";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { AuraLogo } from "@/components/ui/aura-logo";

interface ConversationPreview {
  id: string;
  startedAt: string;
  lastMessage?: { content: string; role: string; createdAt: string };
}

interface SchedulePreview {
  id: string;
  type: string;
  cronExpr: string;
  enabled: boolean;
  metadata?: { label?: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [engagementStreak, setEngagementStreak] = useState(0);
  const [schedules, setSchedules] = useState<SchedulePreview[]>([]);
  const [engagedToday, setEngagedToday] = useState(false);

  useEffect(() => {
    apiFetch<ConversationPreview[]>("/conversations?limit=5").then((res) => {
      if (res.success && res.data) setConversations(res.data);
    });
    apiFetch<{ currentStreak: number; engagedToday: boolean }>("/analytics/summary").then((res) => {
      if (res.success && res.data) {
        setEngagementStreak(res.data.currentStreak);
        setEngagedToday(res.data.engagedToday);
      }
    });
    apiFetch<SchedulePreview[]>("/schedules").then((res) => {
      if (res.success && res.data) setSchedules(res.data);
    });
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning,";
    if (h < 17) return "Hey,";
    return "Good evening,";
  })();

  const activeSchedules = schedules.filter((s) => s.enabled);

  return (
    <div className="space-y-8">
      {/* Hero greeting with streak */}
      <div className="rounded-[20px] border border-border/50 bg-card/80 backdrop-blur-xl p-5 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] sm:text-[34px] font-bold tracking-tight">
              {greeting} {user?.firstName ?? "there"}
            </h1>
          </div>
          <Link href="/analytics">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              Analytics <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:flex sm:items-center sm:gap-10">
          {/* Streak */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-[16px] bg-accent flex items-center justify-center">
              <span className="text-[28px]">🔥</span>
            </div>
            <div>
              <p className="text-[24px] sm:text-[32px] font-bold tracking-tight leading-none">
                {engagementStreak}
              </p>
              <p className="text-[14px] text-muted-foreground mt-0.5">day streak</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-12 w-px bg-border" />

          {/* Active schedules */}
          <div>
            <p className="text-[24px] sm:text-[32px] font-bold tracking-tight leading-none">
              {activeSchedules.length}
            </p>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              active schedule{activeSchedules.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-12 w-px bg-border" />

          {/* Plan */}
          <div>
            <p className="text-[24px] sm:text-[32px] font-bold tracking-tight leading-none">
              {formatEnum(user?.plan ?? "FREE")}
            </p>
            <p className="text-[14px] text-muted-foreground mt-0.5">plan</p>
          </div>

          {/* Status dot */}
          {engagedToday && (
            <>
              <div className="hidden sm:block h-12 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[14px] text-emerald-500 font-medium">Active today</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat with Aura CTA */}
      <Link href="/chat">
        <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl p-4 sm:p-6 flex items-center justify-between hover:border-foreground/15 transition-all duration-200 cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center text-background">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[17px] font-semibold">Chat with Aura</p>
              <p className="text-[14px] text-muted-foreground">
                Start or continue a conversation with your AI coach
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </Link>

      {/* Two-column: Conversations + Schedules */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Conversations</CardTitle>
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                Chat <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[17px] text-muted-foreground">Nothing here yet.</p>
                <p className="text-[14px] text-muted-foreground/60 mt-1">
                  Start a conversation with Aura.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href="/chat"
                    className="flex items-center justify-between rounded-[12px] px-4 py-3 -mx-2 hover:bg-accent transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <AuraLogo className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        {conv.lastMessage ? (
                          <p className="text-[15px] truncate">{conv.lastMessage.content}</p>
                        ) : (
                          <p className="text-[15px] text-muted-foreground">Empty conversation</p>
                        )}
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          {new Date(conv.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-3" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming schedules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedules</CardTitle>
            <Link href="/schedules">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                Manage <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activeSchedules.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[17px] text-muted-foreground">No schedules yet.</p>
                <p className="text-[14px] text-muted-foreground/60 mt-1">
                  Set up when Aura should check in with you.
                </p>
                <Link href="/schedules">
                  <Button size="sm" className="mt-5">
                    Create schedule
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activeSchedules.slice(0, 5).map((schedule) => {
                  const label = schedule.metadata?.label ?? formatEnum(schedule.type);

                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between rounded-[12px] px-4 py-3 -mx-2 hover:bg-accent transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <span className="text-[18px]">🔔</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium truncate">{label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[13px] text-muted-foreground">Active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
