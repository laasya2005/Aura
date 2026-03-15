export {
  buildPersonalityPrompt,
  getPresetSliders,
  PERSONALITY_PRESETS,
  type PersonalitySliders,
  type PersonalityPreset,
} from "./personality.js";

export {
  chat,
  _setClient as _setAIClient,
  type ChatMessage,
  type ChatResponse,
  type ChatOptions,
} from "./claude.js";

export {
  buildSystemPrompt,
  buildConversationMessages,
  buildStreakCompliment,
  buildProactivePrompt,
  type UserContext,
  type AuraContext,
  type PromptParts,
} from "./prompt-builder.js";

export { checkSafety, SAFETY_DISCLAIMER, type SafetyResult } from "./safety-filter.js";

export { detectCrisis, type CrisisResult } from "./crisis-detector.js";

export { generateEmbedding, cosineSimilarity, summarizeConversation } from "./embeddings.js";
