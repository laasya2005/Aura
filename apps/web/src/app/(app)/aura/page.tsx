"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AuraProfile {
  id: string;
  mode: string;
  warmth: number;
  humor: number;
  directness: number;
  energy: number;
  customPrompt?: string;
  personalityPrompt?: string;
}

const MODES = [
  {
    value: "GLOW",
    name: "Glow",
    emoji: "✨",
    desc: "Warm, supportive, encouraging",
    vibe: "Like a best friend cheering you on",
  },
  {
    value: "FLAME",
    name: "Flame",
    emoji: "🔥",
    desc: "Bold, motivating, no-nonsense",
    vibe: "Tough love that gets results",
  },
  {
    value: "MIRROR",
    name: "Mirror",
    emoji: "🪞",
    desc: "Thoughtful, reflective, insightful",
    vibe: "Asks the right questions",
  },
  {
    value: "TIDE",
    name: "Tide",
    emoji: "🌊",
    desc: "Calm, zen, grounding",
    vibe: "Mindful nudges and patience",
  },
  {
    value: "VOLT",
    name: "Volt",
    emoji: "⚡",
    desc: "Energetic, fun, hype",
    vibe: "Maximum energy to pump you up",
  },
  {
    value: "CUSTOM",
    name: "Custom",
    emoji: "🎨",
    desc: "Your own blend",
    vibe: "Design it from scratch",
  },
];

const SLIDERS = [
  { key: "warmth", label: "Warmth", low: "Professional", high: "Caring" },
  { key: "humor", label: "Humor", low: "Serious", high: "Playful" },
  { key: "directness", label: "Directness", low: "Gentle", high: "Blunt" },
  { key: "energy", label: "Energy", low: "Calm", high: "Energetic" },
] as const;

export default function AuraPage() {
  const [profile, setProfile] = useState<AuraProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const res = await apiFetch<AuraProfile>("/aura/profile");
    if (res.success && res.data) setProfile(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectMode = async (mode: string) => {
    setSaving(true);
    await apiFetch("/aura/profile", {
      method: "PATCH",
      body: JSON.stringify({ mode }),
    });
    await load();
    setSaving(false);
  };

  const updateSlider = async (key: string, value: number) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });

    setSaving(true);
    await apiFetch("/aura/profile", {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    });
    await load();
    setSaving(false);
  };

  const selectedMode = MODES.find((m) => m.value === profile?.mode);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Aura</h1>
        <p className="text-base text-muted-foreground mt-1">
          Pick a personality and fine-tune how your coach sounds.
        </p>
      </div>

      {/* Current mode highlight */}
      {selectedMode && (
        <div className="rounded-[20px] border border-border/50 bg-card/80 backdrop-blur-xl p-8">
          <p className="text-[14px] text-muted-foreground font-medium">Current mode</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-[48px]">{selectedMode.emoji}</span>
            <div>
              <p className="text-[28px] font-bold tracking-tight">{selectedMode.name}</p>
              <p className="text-[15px] text-muted-foreground">{selectedMode.vibe}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mode grid */}
      <div>
        <p className="text-[14px] text-muted-foreground font-medium mb-4">All modes</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((mode) => {
            const isSelected = profile?.mode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => selectMode(mode.value)}
                disabled={saving}
                className={cn(
                  "group relative rounded-[16px] border p-5 text-left transition-all duration-200",
                  isSelected
                    ? "border-foreground/20 bg-accent"
                    : "border-border/50 hover:border-foreground/15 hover:bg-accent/50"
                )}
              >
                <span className="text-[32px] block mb-3">{mode.emoji}</span>
                <p className="text-[16px] font-semibold">{mode.name}</p>
                <p className="text-[14px] text-muted-foreground mt-1">{mode.desc}</p>
                {isSelected && (
                  <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-foreground flex items-center justify-center">
                    <span className="text-background text-[12px]">&#10003;</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders — macOS grouped list style */}
      {profile && (
        <div>
          <p className="text-[14px] text-muted-foreground font-medium mb-4">Fine-tune</p>
          <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl divide-y divide-border/50 overflow-hidden">
            {SLIDERS.map((slider) => {
              const value = Math.round((profile[slider.key] ?? 0.5) * 100);
              return (
                <div key={slider.key} className="px-6 py-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[16px] font-medium">{slider.label}</span>
                    <span className="text-[14px] text-muted-foreground tabular-nums">{value}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] text-muted-foreground w-20 text-right">
                      {slider.low}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => updateSlider(slider.key, parseInt(e.target.value) / 100)}
                      className="flex-1"
                    />
                    <span className="text-[13px] text-muted-foreground w-20">{slider.high}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
