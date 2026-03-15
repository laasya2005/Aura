"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { formatEnum } from "@/lib/utils";
import { ArrowUpRight, Flame, Target, MessageCircle, Crown } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  category: string;
  currentStreak: number;
  status: string;
}

interface ConversationPreview {
  id: string;
  channel: string;
  startedAt: string;
  lastMessage?: { content: string; role: string; createdAt: string };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);

  useEffect(() => {
    apiFetch<Goal[]>("/goals?status=ACTIVE").then((res) => {
      if (res.success && res.data) setGoals(res.data);
    });
    apiFetch<ConversationPreview[]>("/conversations?limit=3").then((res) => {
      if (res.success && res.data) setConversations(res.data);
    });
  }, []);

  const totalStreak = goals.reduce((sum, g) => sum + g.currentStreak, 0);

  const stats = [
    { label: "Active goals", value: goals.length, icon: Target },
    { label: "Streak days", value: totalStreak, icon: Flame },
    { label: "Conversations", value: conversations.length, icon: MessageCircle },
    { label: "Plan", value: formatEnum(user?.plan ?? "FREE"), icon: Crown },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}{" "}
          <span className="inline-block animate-bounce-subtle">👋</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s an overview of your progress.
        </p>
      </div>

      {/* Metric cards — bento style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-lg hover:border-foreground/10 hover:-translate-y-0.5"
          >
            <stat.icon className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Active Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-foreground" />
              </div>
              <CardTitle>Active goals</CardTitle>
            </div>
            <Link href="/goals">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                View all <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-sm text-muted-foreground">No active goals yet.</p>
                <Link href="/goals">
                  <Button size="sm" className="mt-3">
                    Create a goal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {goals.slice(0, 5).map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 -mx-3 hover:bg-accent transition-all duration-200 group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{goal.title}</p>
                      <p className="text-xs text-muted-foreground">{formatEnum(goal.category)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <Flame className="h-3.5 w-3.5 text-foreground streak-fire" />
                      <span className="text-xs font-bold tabular-nums">{goal.currentStreak}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
                <MessageCircle className="h-3.5 w-3.5 text-foreground" />
              </div>
              <CardTitle>Recent conversations</CardTitle>
            </div>
            <Link href="/chat">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                Chat <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
                <Link href="/chat">
                  <Button size="sm" className="mt-3">
                    Start chatting
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/chat?id=${conv.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 -mx-3 hover:bg-accent transition-all duration-200 group"
                  >
                    <div className="min-w-0">
                      {conv.lastMessage ? (
                        <p className="text-sm truncate">{conv.lastMessage.content}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Empty conversation</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatEnum(conv.channel)} &middot;{" "}
                        {new Date(conv.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-3" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
