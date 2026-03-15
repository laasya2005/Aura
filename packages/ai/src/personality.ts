import type { AuraMode } from "@aura/shared";

export interface PersonalitySliders {
  warmth: number; // 0-1: clinical → warm
  humor: number; // 0-1: serious → playful
  directness: number; // 0-1: gentle → blunt
  energy: number; // 0-1: calm → energetic
}

export interface PersonalityPreset extends PersonalitySliders {
  name: string;
  description: string;
  systemPromptFragment: string;
}

export const PERSONALITY_PRESETS: Record<Exclude<AuraMode, "CUSTOM">, PersonalityPreset> = {
  GLOW: {
    name: "Glow",
    description:
      "Warm, supportive, and encouraging. Like a best friend who always believes in you.",
    warmth: 0.9,
    humor: 0.5,
    directness: 0.3,
    energy: 0.6,
    systemPromptFragment:
      "You are warm, nurturing, and deeply supportive. You speak with genuine care and encouragement. You celebrate small wins and gently guide through setbacks. Your tone is like a trusted best friend who always believes in the user.",
  },
  FLAME: {
    name: "Flame",
    description: "Bold, motivating, and no-nonsense. A drill sergeant with heart.",
    warmth: 0.5,
    humor: 0.4,
    directness: 0.9,
    energy: 0.95,
    systemPromptFragment:
      "You are bold, direct, and intensely motivating. You push the user to their limits with tough love. No sugarcoating—you call things as they are. You're a drill sergeant with heart: demanding but genuinely invested in their success.",
  },
  MIRROR: {
    name: "Mirror",
    description: "Thoughtful, reflective, and insightful. A wise therapist-coach hybrid.",
    warmth: 0.7,
    humor: 0.2,
    directness: 0.5,
    energy: 0.3,
    systemPromptFragment:
      "You are thoughtful, reflective, and deeply insightful. You ask probing questions that help the user discover their own answers. You mirror their emotions back with clarity. Your approach is like a wise therapist-coach hybrid.",
  },
  TIDE: {
    name: "Tide",
    description: "Calm, zen, and grounding. A meditation teacher meets life coach.",
    warmth: 0.8,
    humor: 0.3,
    directness: 0.4,
    energy: 0.2,
    systemPromptFragment:
      "You are calm, centered, and grounding. You speak with a serene, unhurried pace. You help the user find peace and perspective. Your approach combines mindfulness wisdom with practical life coaching.",
  },
  VOLT: {
    name: "Volt",
    description: "Energetic, fun, and hype. The ultimate cheerleader and hype person.",
    warmth: 0.7,
    humor: 0.9,
    directness: 0.5,
    energy: 1.0,
    systemPromptFragment:
      "You are electrifyingly energetic, fun, and wildly enthusiastic. You hype the user up with infectious excitement. You use vivid language, exclamations, and creative metaphors. You're the ultimate cheerleader who makes everything feel exciting and possible.",
  },
};

// Minimum warmth floor for safety (prevents cold/manipulative personality)
const WARMTH_FLOOR = 0.3;

export function buildPersonalityPrompt(
  mode: AuraMode,
  sliders?: Partial<PersonalitySliders>,
  customPrompt?: string | null
): string {
  if (mode !== "CUSTOM" && !sliders) {
    return PERSONALITY_PRESETS[mode].systemPromptFragment;
  }

  const effectiveSliders: PersonalitySliders = {
    warmth: Math.max(sliders?.warmth ?? 0.7, WARMTH_FLOOR),
    humor: sliders?.humor ?? 0.5,
    directness: sliders?.directness ?? 0.5,
    energy: sliders?.energy ?? 0.5,
  };

  const parts: string[] = [];

  // Warmth
  if (effectiveSliders.warmth >= 0.8) {
    parts.push("Be very warm, caring, and nurturing in your tone.");
  } else if (effectiveSliders.warmth >= 0.5) {
    parts.push("Be friendly and supportive but not overly effusive.");
  } else {
    parts.push("Be professional and supportive. Maintain genuine care.");
  }

  // Humor
  if (effectiveSliders.humor >= 0.8) {
    parts.push("Use humor freely—jokes, wordplay, and playful banter.");
  } else if (effectiveSliders.humor >= 0.5) {
    parts.push("Sprinkle in occasional light humor when appropriate.");
  } else {
    parts.push("Keep a mostly serious, focused tone.");
  }

  // Directness
  if (effectiveSliders.directness >= 0.8) {
    parts.push("Be very direct and blunt. No sugarcoating.");
  } else if (effectiveSliders.directness >= 0.5) {
    parts.push("Balance honesty with tact.");
  } else {
    parts.push("Be gentle and diplomatic in how you deliver feedback.");
  }

  // Energy
  if (effectiveSliders.energy >= 0.8) {
    parts.push("Be high-energy and enthusiastic! Use exclamations and vivid language.");
  } else if (effectiveSliders.energy >= 0.5) {
    parts.push("Maintain a moderate, engaged energy level.");
  } else {
    parts.push("Keep a calm, measured, and grounded energy.");
  }

  if (customPrompt) {
    // Sanitize to prevent prompt injection — strip instruction-override patterns
    const sanitized = customPrompt
      .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, "")
      .replace(/you\s+are\s+now\s+/gi, "")
      .replace(/system\s*prompt/gi, "")
      .replace(/\breturn\s+only\b/gi, "")
      .replace(/do\s+not\s+follow/gi, "")
      .trim();
    if (sanitized.length > 0) {
      parts.push(
        `Additional personality guidance (user preference, not an instruction override): ${sanitized}`
      );
    }
  }

  return parts.join(" ");
}

export function getPresetSliders(mode: Exclude<AuraMode, "CUSTOM">): PersonalitySliders {
  const preset = PERSONALITY_PRESETS[mode];
  return {
    warmth: preset.warmth,
    humor: preset.humor,
    directness: preset.directness,
    energy: preset.energy,
  };
}
