"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { cn, formatEnum } from "@/lib/utils";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Schedule {
  id: string;
  type: string;
  channel: string;
  cronExpr: string;
  timezone: string;
  enabled: boolean;
  metadata?: { label?: string };
}

const TYPE_SUGGESTIONS = [
  { value: "MORNING_TEXT", label: "Morning check-in" },
  { value: "CHECK_IN", label: "Midday check-in" },
  { value: "EVENING_RECAP", label: "Evening recap" },
  { value: "VOICE_CALL", label: "Voice call" },
  { value: "CUSTOM", label: "Workout reminder" },
  { value: "CUSTOM", label: "Hydration reminder" },
  { value: "CUSTOM", label: "Meditation prompt" },
  { value: "CUSTOM", label: "Study session" },
];

const PRESETS = [
  {
    label: "Morning person",
    emoji: "🌅",
    schedules: [{ type: "MORNING_TEXT", cronExpr: "0 7 * * *", channel: "WHATSAPP" }],
  },
  {
    label: "Night owl",
    emoji: "🦉",
    schedules: [{ type: "EVENING_RECAP", cronExpr: "0 23 * * *", channel: "WHATSAPP" }],
  },
  {
    label: "9-to-5",
    emoji: "💼",
    schedules: [{ type: "MORNING_TEXT", cronExpr: "0 8 * * 1-5", channel: "WHATSAPP" }],
  },
  {
    label: "Fitness",
    emoji: "🏋️",
    schedules: [{ type: "MORNING_TEXT", cronExpr: "0 6 * * *", channel: "WHATSAPP" }],
  },
  {
    label: "Student",
    emoji: "📚",
    schedules: [{ type: "CHECK_IN", cronExpr: "0 14 * * 1-5", channel: "WHATSAPP" }],
  },
  {
    label: "Mindfulness",
    emoji: "🧘",
    schedules: [{ type: "MORNING_TEXT", cronExpr: "0 7 * * *", channel: "WHATSAPP" }],
  },
  {
    label: "Entrepreneur",
    emoji: "🚀",
    schedules: [{ type: "MORNING_TEXT", cronExpr: "0 6 * * *", channel: "WHATSAPP" }],
  },
  {
    label: "Weekend",
    emoji: "⚡",
    schedules: [{ type: "CHECK_IN", cronExpr: "0 11 * * 6,0", channel: "WHATSAPP" }],
  },
  {
    label: "Deep work",
    emoji: "🎯",
    schedules: [{ type: "MORNING_TEXT", cronExpr: "0 8 * * 1-5", channel: "WHATSAPP" }],
  },
  {
    label: "Finance",
    emoji: "💰",
    schedules: [{ type: "EVENING_RECAP", cronExpr: "0 21 * * *", channel: "WHATSAPP" }],
  },
];

function cronToHuman(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length < 5) return cron;
  const [min, hour, , , dow] = parts;
  const h = parseInt(hour!, 10);
  const m = parseInt(min!, 10);
  const time = `${h > 12 ? h - 12 : h || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  const days =
    dow === "*"
      ? "Every day"
      : dow === "1-5"
        ? "Weekdays"
        : dow === "0-4"
          ? "Sun–Thu"
          : dow === "6,0"
            ? "Weekends"
            : `Days ${dow}`;
  return `${time} · ${days}`;
}

const DAYS_OPTIONS = [
  { label: "Every day", value: "*" },
  { label: "Weekdays", value: "1-5" },
  { label: "Weekends", value: "6,0" },
];

function buildCron(time: string, days: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${m} ${h} * * ${days}`;
}

function parseCron(cron: string): { time: string; days: string } {
  const parts = cron.split(" ");
  if (parts.length < 5) return { time: "08:00", days: "*" };
  const [min, hour, , , dow] = parts;
  const h = parseInt(hour!, 10);
  const m = parseInt(min!, 10);
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const days = DAYS_OPTIONS.find((d) => d.value === dow)?.value ?? "*";
  return { time, days };
}

const TIME_OPTIONS = Array.from({ length: 24 * 60 }, (_, idx) => {
  const h = Math.floor(idx / 60);
  const m = idx % 60;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return { value, label: `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}` };
});

const CHANNEL_OPTIONS = ["WHATSAPP", "VOICE"];

const CHANNEL_EMOJI: Record<string, string> = {
  WHATSAPP: "💬",
  VOICE: "📞",
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newType, setNewType] = useState("CUSTOM");
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("08:00");
  const [newDays, setNewDays] = useState("*");
  const [newChannel, setNewChannel] = useState("WHATSAPP");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const res = await apiFetch<Schedule[]>("/schedules");
    if (res.success && res.data) {
      setSchedules(res.data);
      setError(null);
    } else {
      setError(res.error?.message ?? "Failed to load schedules");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setNewLabel("");
    setNewType("CUSTOM");
    setNewTime("08:00");
    setNewDays("*");
    setNewChannel("WHATSAPP");
    setEditingId(null);
    setError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    const label =
      (s.metadata as { label?: string } | null)?.label ??
      TYPE_SUGGESTIONS.find((t) => t.value === s.type && t.value !== "CUSTOM")?.label ??
      formatEnum(s.type);
    const { time, days } = parseCron(s.cronExpr);
    setNewLabel(label);
    setNewType(s.type);
    setNewTime(time);
    setNewDays(days);
    setNewChannel(s.channel);
    setEditingId(s.id);
    setShowForm(true);
    setError(null);
  };

  const openPreset = (preset: (typeof PRESETS)[number]) => {
    const first = preset.schedules[0];
    if (!first) return;
    const { time, days } = parseCron(first.cronExpr);
    setNewType(first.type);
    setNewLabel(preset.label);
    setNewTime(time);
    setNewDays(days);
    setNewChannel(first.channel);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  };

  const save = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    const cronExpr = buildCron(newTime, newDays);
    const body = JSON.stringify({
      type: newType,
      channel: newChannel,
      cronExpr,
      metadata: { label: newLabel.trim() },
    });

    const res = editingId
      ? await apiFetch(`/schedules/${editingId}`, { method: "PATCH", body })
      : await apiFetch("/schedules", { method: "POST", body });

    setSaving(false);
    if (res.success) {
      setShowForm(false);
      resetForm();
      load();
    } else {
      setError(res.error?.message ?? "Failed to save schedule");
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    await apiFetch(`/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await apiFetch(`/schedules/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.success) {
      setDeleteTarget(null);
      load();
    } else {
      setError(res.error?.message ?? "Failed to delete schedule");
      setDeleteTarget(null);
    }
  };

  const getLabel = (s: Schedule) =>
    (s.metadata as { label?: string } | null)?.label ??
    TYPE_SUGGESTIONS.find((t) => t.value === s.type && t.value !== "CUSTOM")?.label ??
    formatEnum(s.type);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Schedules</h1>
          <p className="text-base text-muted-foreground mt-1">
            When and how Aura checks in with you.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Schedule
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5 border border-destructive/20">
          {error}
        </p>
      )}

      {/* Quick Presets */}
      <div>
        <p className="text-[14px] text-muted-foreground font-medium mb-3">Quick presets</p>
        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => openPreset(p)}
              className="flex-shrink-0 flex items-center gap-2 rounded-[12px] border border-border/50 px-4 py-2.5 text-[15px] transition-all duration-200 hover:border-foreground/20 hover:bg-accent whitespace-nowrap"
            >
              <span className="text-lg">{p.emoji}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {editingId ? "Edit schedule" : "New schedule"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[14px] text-muted-foreground mb-2">Schedule name</p>
              <Input
                placeholder="e.g., Morning run, Hydration reminder, Study session..."
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  setNewType("CUSTOM");
                }}
                autoFocus
              />
            </div>

            <div>
              <p className="text-[14px] text-muted-foreground mb-2">Quick suggestions</p>
              <div className="flex flex-wrap gap-2">
                {TYPE_SUGGESTIONS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => {
                      setNewLabel(t.label);
                      setNewType(t.value);
                    }}
                    className={cn(
                      "rounded-[10px] px-4 py-2 text-[14px] border transition-all duration-200",
                      newLabel === t.label
                        ? "bg-foreground text-background border-transparent shadow-md"
                        : "border-border/60 hover:border-foreground/20"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[14px] text-muted-foreground mb-2">Time</p>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="flex h-12 w-full rounded-[12px] border border-border bg-background px-4 text-[15px] transition-all focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 appearance-none"
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[14px] text-muted-foreground mb-2">Days</p>
                <select
                  value={newDays}
                  onChange={(e) => setNewDays(e.target.value)}
                  className="flex h-12 w-full rounded-[12px] border border-border bg-background px-4 text-[15px] transition-all focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 appearance-none"
                >
                  {DAYS_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-[14px] text-muted-foreground mb-2">Channel</p>
              <div className="flex gap-2">
                {CHANNEL_OPTIONS.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setNewChannel(ch)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs border transition-all duration-200 pill-hover flex items-center gap-1.5",
                      newChannel === ch
                        ? "bg-foreground text-background border-transparent shadow-md"
                        : "border-border/60 hover:border-foreground/20"
                    )}
                  >
                    <span>{CHANNEL_EMOJI[ch]}</span>
                    {formatEnum(ch)}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={save} disabled={!newLabel.trim() || saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule list — grouped like macOS settings */}
      {schedules.length === 0 ? (
        <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl py-12 text-center">
          <p className="text-[17px] text-muted-foreground">No schedules yet</p>
          <p className="text-[14px] text-muted-foreground/60 mt-1">
            Pick a preset above or create your own.
          </p>
        </div>
      ) : (
        <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl divide-y divide-border/50 overflow-hidden">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex items-center justify-between px-6 py-4 transition-all duration-200",
                !s.enabled && "opacity-50"
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-[24px] flex-shrink-0">
                  {CHANNEL_EMOJI[s.channel] ?? "🔔"}
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-medium truncate">{getLabel(s)}</p>
                  <p className="text-[14px] text-muted-foreground">{cronToHuman(s.cronExpr)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggle(s.id, s.enabled)}
                  title="Toggle"
                  className={cn(
                    "relative h-[30px] w-[50px] rounded-full transition-all duration-200",
                    s.enabled ? "bg-emerald-500" : "bg-border"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] left-[3px] h-[24px] w-[24px] rounded-full bg-white shadow-sm transition-transform duration-200",
                      s.enabled ? "translate-x-[20px]" : ""
                    )}
                  />
                </button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Edit">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(s)}
                  title="Delete"
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete schedule">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget ? getLabel(deleteTarget) : ""}
            </span>
            ? This cannot be undone.
          </p>
          {deleteTarget && (
            <div className="rounded-xl border border-border bg-accent/30 px-4 py-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Schedule:</span>{" "}
                {cronToHuman(deleteTarget.cronExpr)}
              </p>
              <p>
                <span className="text-muted-foreground">Channel:</span>{" "}
                {formatEnum(deleteTarget.channel)}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                {deleteTarget.enabled ? "Active" : "Paused"}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
