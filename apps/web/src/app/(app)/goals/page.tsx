"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, formatEnum } from "@/lib/utils";
import { Flame, Plus, Check, Trash2, Trophy } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  currentStreak: number;
  longestStreak: number;
  lastStreakAt?: string;
}

const CATEGORIES = [
  "FITNESS",
  "MINDFULNESS",
  "PRODUCTIVITY",
  "LEARNING",
  "SOCIAL",
  "HEALTH",
  "FINANCE",
  "CREATIVE",
  "CUSTOM",
];

const CATEGORY_EMOJI: Record<string, string> = {
  FITNESS: "💪",
  MINDFULNESS: "🧘",
  PRODUCTIVITY: "🚀",
  LEARNING: "📚",
  SOCIAL: "🤝",
  HEALTH: "🌿",
  FINANCE: "💰",
  CREATIVE: "🎨",
  CUSTOM: "✨",
};

export default function GoalsPage() {
  useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("FITNESS");
  const [customLabel, setCustomLabel] = useState("");
  const [filter, setFilter] = useState("ACTIVE");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [compliment, setCompliment] = useState<{
    message: string;
    goalTitle: string;
    streak: number;
    milestone: number | null;
  } | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const load = () => {
    apiFetch<Goal[]>(`/goals?status=${filter}`).then((res) => {
      if (res.success && res.data) setGoals(res.data);
    });
  };

  useEffect(() => {
    load();
  }, [filter]);

  const createGoal = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError("");
    const description =
      newCategory === "CUSTOM" && customLabel.trim() ? customLabel.trim() : undefined;
    const res = await apiFetch("/goals", {
      method: "POST",
      body: JSON.stringify({ title: newTitle, category: newCategory, description }),
    });
    setCreating(false);
    if (res.success) {
      setNewTitle("");
      setCustomLabel("");
      setShowCreate(false);
      load();
    } else {
      setCreateError(res.error?.message ?? "Failed to create goal");
    }
  };

  const recordStreak = async (goalId: string) => {
    setCheckingIn(goalId);
    const res = await apiFetch<{ goal: Goal; milestone?: number; compliment?: string }>(
      `/goals/${goalId}/streak`,
      { method: "POST" }
    );
    setCheckingIn(null);
    if (res.success && res.data) {
      load();
      const msg = res.data.compliment;
      if (msg) {
        setCompliment({
          message: msg,
          goalTitle: res.data.goal.title,
          streak: res.data.goal.currentStreak,
          milestone: res.data.milestone ?? null,
        });
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    const res = await apiFetch(`/goals/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.success) {
      setDeleteTarget(null);
      load();
    } else {
      setDeleteError(res.error?.message ?? "Failed to delete goal");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            Goals <span className="text-xl">🎯</span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Track progress and build streaks.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Goal
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["ACTIVE", "COMPLETED", "PAUSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
              filter === s
                ? "bg-foreground text-background shadow-md"
                : "bg-card/80 border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/20"
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Input
              placeholder="What's your goal?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter((c) => c !== "CUSTOM").map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs border transition-all duration-200 pill-hover flex items-center gap-1.5",
                      newCategory === cat
                        ? "bg-foreground text-background border-transparent shadow-md"
                        : "border-border/60 hover:border-foreground/20"
                    )}
                  >
                    <span>{CATEGORY_EMOJI[cat]}</span>
                    {formatEnum(cat)}
                  </button>
                ))}
                <button
                  onClick={() => setNewCategory("CUSTOM")}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs border border-dashed transition-all duration-200 pill-hover",
                    newCategory === "CUSTOM"
                      ? "bg-foreground text-background border-transparent border-solid shadow-md"
                      : "border-border/60 hover:border-foreground/20"
                  )}
                >
                  ✨ Custom
                </button>
              </div>
            </div>
            {newCategory === "CUSTOM" && (
              <Input
                placeholder="Describe your goal type (e.g., Self-care, Journaling, Cooking...)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            )}
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <div className="flex gap-2">
              <Button onClick={createGoal} disabled={!newTitle.trim() || creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreate(false);
                  setCreateError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="text-4xl mb-3">🏗️</div>
            <p className="text-sm text-muted-foreground">
              No {filter.toLowerCase()} goals. Create one to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="flex items-center justify-between pt-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_EMOJI[goal.category] ?? "✨"}</span>
                    <h3 className="font-semibold">{goal.title}</h3>
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-2xs text-muted-foreground border border-border/40">
                      {formatEnum(goal.category)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-foreground streak-fire" />
                      <span className="font-bold text-foreground">{goal.currentStreak}</span> day
                      streak
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5" />
                      Best: {goal.longestStreak}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {goal.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recordStreak(goal.id)}
                      disabled={checkingIn === goal.id}
                      title="Check in"
                    >
                      {checkingIn === goal.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(goal)}
                    title="Delete"
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete goal">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{deleteTarget?.title}</span>? This will
            also remove all streak data and cannot be undone.
          </p>
          {deleteTarget && (
            <div className="rounded-xl border border-border bg-accent/30 px-4 py-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Category:</span>{" "}
                {formatEnum(deleteTarget.category)}
              </p>
              <p>
                <span className="text-muted-foreground">Current streak:</span>{" "}
                {deleteTarget.currentStreak} days
              </p>
              <p>
                <span className="text-muted-foreground">Best streak:</span>{" "}
                {deleteTarget.longestStreak} days
              </p>
            </div>
          )}
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* AI Compliment modal */}
      <Dialog
        open={!!compliment}
        onClose={() => setCompliment(null)}
        title={
          compliment?.milestone ? `${compliment.milestone}-day milestone! 🏆` : "Nice work! 🎉"
        }
      >
        {compliment && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-[13px] font-medium">{compliment.goalTitle}</p>
              <div className="flex items-center justify-center gap-1.5 text-2xs text-foreground">
                <Flame className="h-4 w-4 streak-fire" />
                <span className="font-bold">{compliment.streak} day streak</span>
              </div>
            </div>
            <div className="rounded-xl bg-accent border border-border px-4 py-3">
              <p className="text-[13px] leading-relaxed">{compliment.message}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setCompliment(null)}>Continue</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
