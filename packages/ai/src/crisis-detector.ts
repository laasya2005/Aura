export interface CrisisResult {
  detected: boolean;
  severity: "none" | "low" | "high";
  responseOverride?: string;
}

// High-severity: immediate danger signals
const HIGH_SEVERITY_PATTERNS: RegExp[] = [
  /\b(?:kill\s+my\s*self|end\s+(?:my\s+)?(?:life|it\s+all))\b/i,
  /\b(?:suicide|suicidal)\b/i,
  /\bwant\s+to\s+die\b/i,
  /\b(?:don't|do\s+not)\s+want\s+to\s+(?:live|be\s+alive|exist)\b/i,
  /\b(?:planning|plan)\s+to\s+(?:hurt|harm|kill)\s+(?:my\s*self|me)\b/i,
  /\b(?:self[- ]?harm|cut(?:ting)?\s+my\s*self)\b/i,
  /\b(?:overdose|OD)\b/i,
  /\b(?:jump(?:ing)?\s+off|hang(?:ing)?\s+my\s*self)\b/i,
];

// Low-severity: concerning but not immediate
const LOW_SEVERITY_PATTERNS: RegExp[] = [
  /\b(?:hopeless|no\s+hope|give\s+up\s+on\s+(?:life|everything))\b/i,
  /\b(?:worthless|no\s+point|nothing\s+matters)\b/i,
  /\b(?:can't\s+go\s+on|can't\s+take\s+(?:it|this)\s+anymore)\b/i,
  /\bno\s+reason\s+to\s+(?:live|keep\s+going)\b/i,
  /\bbetter\s+off\s+(?:dead|without\s+me)\b/i,
  /\b(?:everyone|world)\s+would\s+be\s+better\s+(?:off\s+)?(?:without\s+me)\b/i,
];

const CRISIS_RESPONSE_HIGH = `I hear you, and I want you to know that what you're feeling matters. You don't have to face this alone.

Please reach out to the 988 Suicide & Crisis Lifeline right now:
- Call or text: 988
- Chat: https://988lifeline.org/chat

If you're in immediate danger, please call 911.

You matter, and there are people who want to help.`;

const CRISIS_RESPONSE_LOW = `I can hear you're going through a really tough time, and I want you to know that's okay to feel this way. But I also want to make sure you have support.

If you ever feel overwhelmed or in crisis, please remember:
- 988 Suicide & Crisis Lifeline: Call or text 988
- Crisis Text Line: Text HOME to 741741

Would you like to talk about what's going on?`;

export function detectCrisis(message: string): CrisisResult {
  // Check high severity first
  for (const pattern of HIGH_SEVERITY_PATTERNS) {
    if (pattern.test(message)) {
      return {
        detected: true,
        severity: "high",
        responseOverride: CRISIS_RESPONSE_HIGH,
      };
    }
  }

  // Check low severity
  for (const pattern of LOW_SEVERITY_PATTERNS) {
    if (pattern.test(message)) {
      return {
        detected: true,
        severity: "low",
        responseOverride: CRISIS_RESPONSE_LOW,
      };
    }
  }

  return { detected: false, severity: "none" };
}
