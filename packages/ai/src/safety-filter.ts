export interface SafetyResult {
  safe: boolean;
  flags: string[];
  filtered?: string;
}

// Patterns that should never appear in Aura's output
const BLOCKED_PATTERNS: Array<{ pattern: RegExp; flag: string }> = [
  {
    pattern: /(?:buy|purchase|invest(?:ment)?|sell)\s+(?:stock|crypto|bitcoin|ethereum|nft)/i,
    flag: "financial_advice",
  },
  {
    pattern:
      /(?:take|stop\s+taking|increase|decrease)\s+(?:your\s+)?(?:medication|dose|dosage|prescription)/i,
    flag: "medical_advice",
  },
  {
    pattern: /(?:you\s+should\s+)?(?:sue|file\s+a\s+lawsuit|get\s+a\s+lawyer|legal\s+action)/i,
    flag: "legal_advice",
  },
  {
    pattern:
      /(?:I\s+am\s+(?:a\s+)?(?:human|person|real)|I\s+have\s+(?:feelings|emotions|consciousness))/i,
    flag: "identity_claim",
  },
  {
    pattern: /(?:password|social\s+security|credit\s+card|bank\s+account)\s*(?:number|#|is)/i,
    flag: "pii_solicitation",
  },
];

// Patterns that get softened/replaced rather than blocked
const SOFTENED_PATTERNS: Array<{
  pattern: RegExp;
  replacement: string;
  flag: string;
}> = [
  {
    pattern:
      /you\s+(?:must|have\s+to|need\s+to)\s+(?:see\s+a\s+)?(?:doctor|therapist|psychiatrist)/i,
    replacement: "it might be helpful to speak with a professional",
    flag: "directive_medical_referral",
  },
];

export function checkSafety(content: string): SafetyResult {
  const flags: string[] = [];
  let filtered = content;
  let safe = true;

  // Check for blocked patterns
  for (const { pattern, flag } of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      flags.push(flag);
      safe = false;
    }
  }

  // Apply softening replacements
  for (const { pattern, replacement, flag } of SOFTENED_PATTERNS) {
    if (pattern.test(filtered)) {
      filtered = filtered.replace(pattern, replacement);
      flags.push(flag);
    }
  }

  return { safe, flags, filtered: safe ? undefined : filtered };
}

// Generic content safety disclaimer to append when needed
export const SAFETY_DISCLAIMER =
  "I'm an AI companion focused on motivation and accountability. For medical, legal, or financial matters, please consult a qualified professional.";
