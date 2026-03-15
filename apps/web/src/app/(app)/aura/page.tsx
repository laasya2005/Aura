"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
  voiceId?: string;
  personalityPrompt?: string;
}

const MODES = [
  { value: "GLOW", name: "Glow", emoji: "✨", desc: "Warm, supportive, encouraging" },
  { value: "FLAME", name: "Flame", emoji: "🔥", desc: "Bold, motivating, no-nonsense" },
  { value: "MIRROR", name: "Mirror", emoji: "🪞", desc: "Thoughtful, reflective, insightful" },
  { value: "TIDE", name: "Tide", emoji: "🌊", desc: "Calm, zen, grounding" },
  { value: "VOLT", name: "Volt", emoji: "⚡", desc: "Energetic, fun, hype" },
  { value: "CUSTOM", name: "Custom", emoji: "🎨", desc: "Design your own blend" },
];

const SLIDERS = [
  { key: "warmth", label: "Warmth", low: "Professional", high: "Warm & Caring", emoji: "💛" },
  { key: "humor", label: "Humor", low: "Serious", high: "Playful", emoji: "😄" },
  { key: "directness", label: "Directness", low: "Gentle", high: "Blunt", emoji: "💪" },
  { key: "energy", label: "Energy", low: "Calm", high: "Energetic", emoji: "⚡" },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2">
          Aura <span className="text-xl">✨</span>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Choose how Aura communicates with you.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((mode) => {
          const isSelected = profile?.mode === mode.value;
          return (
            <button
              key={mode.value}
              onClick={() => selectMode(mode.value)}
              disabled={saving}
              className={cn(
                "group relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-300",
                isSelected
                  ? "border-foreground/20 bg-accent shadow-md"
                  : "border-border/50 hover:border-foreground/15 hover:bg-accent/50 hover:-translate-y-0.5"
              )}
            >
              <span className="text-2xl flex-shrink-0 transition-transform group-hover:scale-110">
                {mode.emoji}
              </span>
              <div>
                <p className="text-sm font-bold">{mode.name}</p>
                <p className="text-2xs text-muted-foreground mt-0.5">{mode.desc}</p>
              </div>
              {isSelected && (
                <span className="absolute top-3 right-3 text-xs font-bold text-foreground">
                  &#10003;
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Personality Sliders
              <span className="text-base">🎚️</span>
            </CardTitle>
            <CardDescription>
              {profile.mode === "CUSTOM"
                ? "Design your unique Aura blend"
                : "Fine-tune your selected mode"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {SLIDERS.map((slider) => {
              const value = Math.round((profile[slider.key] ?? 0.5) * 100);
              return (
                <div key={slider.key} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground text-xs">{slider.low}</span>
                    <span className="font-semibold flex items-center gap-1.5">
                      <span>{slider.emoji}</span>
                      {slider.label}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {value}%
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">{slider.high}</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 h-1.5 rounded-full bg-border top-[9px]" />
                    <div
                      className="absolute h-1.5 rounded-full bg-foreground/60 top-[9px] transition-all duration-200"
                      style={{ width: `${value}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(e) => updateSlider(slider.key, parseInt(e.target.value) / 100)}
                      className="relative w-full"
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
