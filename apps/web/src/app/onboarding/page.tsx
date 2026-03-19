"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Step = "welcome" | "usecase" | "aura" | "schedule" | "done";
const STEPS: Step[] = ["welcome", "usecase", "aura", "schedule", "done"];
const VISIBLE_STEPS = STEPS.filter((s): s is Exclude<Step, "done"> => s !== "done");

const STEP_INFO: Record<Step, { title: string; subtitle: string }> = {
  welcome: {
    title: "Welcome to Aura",
    subtitle: "Let's personalize your experience. This takes about 2 minutes.",
  },
  usecase: { title: "What's your focus?", subtitle: "Pick the areas you want to work on." },
  aura: {
    title: "Choose your coach style",
    subtitle: "Pick a personality and adjust how intense your AI coach should be.",
  },
  schedule: {
    title: "When should your\ncoach check in?",
    subtitle: "Set a time and reminder type for each habit.",
  },
  done: { title: "You're all set!", subtitle: "Aura is ready to keep you on track." },
};

const CATEGORIES = [
  { value: "FITNESS", label: "Fitness", emoji: "🏋️", hint: "Workouts, steps, nutrition" },
  { value: "MINDFULNESS", label: "Mindfulness", emoji: "🧘", hint: "Meditation, gratitude, calm" },
  { value: "PRODUCTIVITY", label: "Productivity", emoji: "🚀", hint: "Deep work, tasks, focus" },
  { value: "LEARNING", label: "Learning", emoji: "📚", hint: "Study, reading, skills" },
  { value: "HEALTH", label: "Health", emoji: "💚", hint: "Sleep, hydration, habits" },
  { value: "FINANCE", label: "Finance", emoji: "💰", hint: "Saving, budgeting, tracking" },
  { value: "SOCIAL", label: "Social", emoji: "🤝", hint: "Connections, outreach, networking" },
  { value: "CREATIVE", label: "Creative", emoji: "🎨", hint: "Writing, art, music" },
];

const MODES = [
  {
    value: "GLOW",
    name: "Glow",
    emoji: "✨",
    desc: "Warm & supportive",
    detail: "Like a best friend cheering you on",
  },
  {
    value: "FLAME",
    name: "Flame",
    emoji: "🔥",
    desc: "Bold & direct",
    detail: "Tough love that gets results",
  },
  {
    value: "MIRROR",
    name: "Mirror",
    emoji: "🪞",
    desc: "Thoughtful & reflective",
    detail: "Asks the right questions to guide you",
  },
  {
    value: "TIDE",
    name: "Tide",
    emoji: "🌊",
    desc: "Calm & grounding",
    detail: "Zen-like guidance and mindful nudges",
  },
  {
    value: "VOLT",
    name: "Volt",
    emoji: "⚡",
    desc: "Energetic & hype",
    detail: "Maximum energy to pump you up",
  },
];

interface ScheduleCard {
  label: string;
  time: string;
  motivation: string;
}

interface OnboardingData {
  firstName: string;
  useCases: string[];
  auraMode: string;
  scheduleCards: ScheduleCard[];
}

const STORAGE_KEY = "aura_onboarding";

function loadSaved(): Partial<OnboardingData> & { step?: Step } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(data: Partial<OnboardingData>, step: Step) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, step }));
  }
}

function timeToCron(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${minutes} ${hours} * * *`;
}

function formatTime12(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<Step>(() => {
    const saved = loadSaved();
    return saved.step && STEPS.includes(saved.step) && saved.step !== "done"
      ? saved.step
      : "welcome";
  });
  const [data, setData] = useState<Partial<OnboardingData>>(() => {
    const { step: _step, ...rest } = loadSaved();
    return {
      scheduleCards: [
        { label: "", time: "09:00", motivation: "" },
      ],
      ...rest,
    };
  });
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    save(data, step);
  }, [data, step]);

  const stepIdx = STEPS.indexOf(step);
  const visibleIdx = (VISIBLE_STEPS as Step[]).indexOf(step);
  const progress = ((visibleIdx + 1) / VISIBLE_STEPS.length) * 100;
  const info = STEP_INFO[step];

  const update = (partial: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...partial }));

  const updateScheduleCard = (index: number, partial: Partial<ScheduleCard>) => {
    const cards = [...(data.scheduleCards ?? [])];
    cards[index] = { ...cards[index]!, ...partial };
    update({ scheduleCards: cards });
  };

  const addScheduleCard = () => {
    update({
      scheduleCards: [
        ...(data.scheduleCards ?? []),
        { label: "", time: "09:00", motivation: "" },
      ],
    });
  };

  const removeScheduleCard = (index: number) => {
    update({ scheduleCards: (data.scheduleCards ?? []).filter((_, i) => i !== index) });
  };

  const next = () => setStep(STEPS[stepIdx + 1]!);
  const back = () => setStep(STEPS[stepIdx - 1]!);

  const finish = async () => {
    setLoading(true);
    try {
      if (data.firstName) {
        await apiFetch("/users/me", {
          method: "PATCH",
          body: JSON.stringify({ firstName: data.firstName }),
        });
      }

      if (data.auraMode) {
        await apiFetch("/aura/profile", {
          method: "PATCH",
          body: JSON.stringify({ mode: data.auraMode }),
        });
      }

      await Promise.all(
        (data.scheduleCards ?? []).map((card) => {
          const cronExpr = timeToCron(card.time);
          return apiFetch("/schedules", {
            method: "POST",
            body: JSON.stringify({
              type: "MORNING_TEXT",
              cronExpr,
              metadata: card.label.trim() ? { label: card.label.trim() } : undefined,
            }),
          });
        })
      );

      await apiFetch("/users/me/consent", {
        method: "POST",
        body: JSON.stringify({ type: "NOTIFICATIONS", granted: true }),
      });

      await apiFetch("/users/me/onboarding/complete", { method: "POST" });
      await refreshUser();
      sessionStorage.removeItem(STORAGE_KEY);
      setShowConfetti(true);
      next();
    } catch {
      // Allow user to retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 relative">
      {/* Background */}
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress bar */}
        {step !== "done" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {step !== "welcome" ? (
                <button
                  onClick={back}
                  className="text-sm text-muted-foreground hover:text-violet-400 transition-colors flex items-center gap-1"
                >
                  &larr; Back
                </button>
              ) : (
                <div />
              )}
              <span className="text-sm text-muted-foreground">
                Step {visibleIdx + 1} of {VISIBLE_STEPS.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full progress-gradient transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Title + subtitle */}
        {step !== "done" && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold leading-tight whitespace-pre-line">
              {data.firstName && info.title.includes("{name}")
                ? info.title.replace("{name}", data.firstName)
                : info.title}
            </h1>
            <p className="mt-2 text-muted-foreground">{info.subtitle}</p>
          </div>
        )}

        {/* Step 1: Welcome */}
        {step === "welcome" && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Your first name
              </label>
              <Input
                placeholder="e.g., Alex"
                value={data.firstName ?? ""}
                onChange={(e) => update({ firstName: e.target.value })}
                className="text-lg h-12"
                autoFocus
              />
            </div>
            <Button
              variant="glow"
              className="w-full h-12 text-base"
              onClick={next}
              disabled={!data.firstName?.trim()}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Use Case */}
        {step === "usecase" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => {
                const selected = (data.useCases ?? []).includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => {
                      const current = data.useCases ?? [];
                      const updated = selected
                        ? current.filter((v) => v !== cat.value)
                        : [...current, cat.value];
                      update({ useCases: updated });
                    }}
                    className={cn(
                      "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                      selected
                        ? "border-foreground/20 bg-accent shadow-md"
                        : "border-border/50 hover:border-foreground/15 hover:bg-accent/50"
                    )}
                  >
                    <span className="text-xl mt-0.5">{cat.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.hint}</p>
                    </div>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-xs">
                        &#10003;
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Button
              variant="glow"
              className="w-full h-12 text-base"
              onClick={next}
              disabled={!data.useCases?.length}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 3: Choose Aura */}
        {step === "aura" && (
          <div className="space-y-6">
            <div className="space-y-3">
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => update({ auraMode: mode.value })}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                    data.auraMode === mode.value
                      ? "border-foreground/20 bg-accent shadow-md"
                      : "border-border/50 hover:border-foreground/15 hover:bg-accent/50"
                  )}
                >
                  <span className="text-3xl">{mode.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{mode.name}</p>
                    <p className="text-sm text-muted-foreground">{mode.detail}</p>
                  </div>
                  {data.auraMode === mode.value && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-sm">
                      &#10003;
                    </span>
                  )}
                </button>
              ))}
            </div>

            <Button
              variant="glow"
              className="w-full h-12 text-base"
              onClick={next}
              disabled={!data.auraMode}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === "schedule" && (
          <div className="space-y-4">
            {(data.scheduleCards ?? []).map((card, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-4 transition-all hover:border-foreground/15"
              >
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Habit name (e.g., Morning run)"
                    value={card.label}
                    onChange={(e) => updateScheduleCard(i, { label: e.target.value })}
                    className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 placeholder:text-muted-foreground/50"
                  />
                  {(data.scheduleCards ?? []).length > 1 && (
                    <button
                      onClick={() => removeScheduleCard(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none"
                      aria-label="Remove"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="w-full">
                    <label className="text-xs text-muted-foreground mb-1.5 block">Time</label>
                    <select
                      value={card.time}
                      onChange={(e) => updateScheduleCard(i, { time: e.target.value })}
                      className="flex h-9 w-full rounded-xl border border-border bg-transparent px-3 text-[13px] transition-all focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 appearance-none"
                    >
                      {Array.from({ length: 24 * 60 }, (_, idx) => {
                        const h = Math.floor(idx / 60);
                        const m = idx % 60;
                        const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                        const hour = h % 12 || 12;
                        const ampm = h < 12 ? "AM" : "PM";
                        const label = `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Why does this habit matter to you? (optional)
                  </label>
                  <textarea
                    value={card.motivation}
                    onChange={(e) => updateScheduleCard(i, { motivation: e.target.value })}
                    placeholder="This makes your coach's motivation much stronger..."
                    rows={2}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addScheduleCard}
              className="w-full rounded-2xl border border-dashed border-border/50 py-3.5 text-sm text-muted-foreground hover:border-foreground/20 hover:text-foreground hover:bg-accent/50 transition-all"
            >
              + Add another check-in
            </button>

            <Button
              variant="glow"
              className="w-full h-12 text-base"
              onClick={finish}
              disabled={loading}
            >
              {loading ? "Setting up..." : "Finish Setup"}
            </Button>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && (
          <div className="space-y-6 text-center">
            {showConfetti && <div className="text-7xl animate-bounce-subtle">&#x1F389;</div>}
            <h1 className="text-3xl font-bold gradient-text">{info.title}</h1>
            <p className="text-muted-foreground">{info.subtitle}</p>
            <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5 text-left space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Your setup summary</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Coach style</span>
                  <span className="font-medium">
                    {MODES.find((m) => m.value === data.auraMode)?.emoji}{" "}
                    {MODES.find((m) => m.value === data.auraMode)?.name}
                  </span>
                </div>
                {(data.scheduleCards ?? []).map((card, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      {card.label
                        ? card.label
                        : `Check-in ${(data.scheduleCards ?? []).length > 1 ? i + 1 : ""}`}
                    </span>
                    <span className="font-medium">
                      {formatTime12(card.time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              variant="glow"
              className="w-full h-12 text-base"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
