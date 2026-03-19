import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildConversationMessages,
  buildProactivePrompt,
} from "../prompt-builder.js";
import type { AuraContext, UserContext } from "../prompt-builder.js";

const mockAura: AuraContext = {
  mode: "GLOW",
};

const mockUser: UserContext = {
  firstName: "Alex",
  timezone: "America/New_York",
  plan: "PRO",
  goals: [{ title: "Run 5K", category: "FITNESS", currentStreak: 7, status: "ACTIVE" }],
  memories: [{ type: "KEY_FACT", content: "User prefers morning workouts" }],
};

describe("Prompt Builder", () => {
  describe("buildSystemPrompt", () => {
    it("should include system preamble", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("You are Aura");
      expect(prompt).toContain("accountability coach");
    });

    it("should include personality", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("PERSONALITY");
    });

    it("should include user context", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("Alex");
      expect(prompt).toContain("America/New_York");
      expect(prompt).toContain("PRO");
    });

    it("should include goals", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("Run 5K");
      expect(prompt).toContain("7-day streak");
    });

    it("should include memories", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("morning workouts");
    });

    it("should include time context", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("TIME CONTEXT");
    });
  });

  describe("buildConversationMessages", () => {
    it("should convert history and add new message", () => {
      const history = [
        { role: "USER" as const, content: "Hi!" },
        { role: "ASSISTANT" as const, content: "Hello!" },
      ];
      const messages = buildConversationMessages(history, "How are you?");
      expect(messages).toHaveLength(3);
      expect(messages[0]).toEqual({ role: "user", content: "Hi!" });
      expect(messages[1]).toEqual({ role: "assistant", content: "Hello!" });
      expect(messages[2]).toEqual({ role: "user", content: "How are you?" });
    });

    it("should limit history to maxHistory", () => {
      const history = Array.from({ length: 30 }, (_, i) => ({
        role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
        content: `msg ${i}`,
      }));
      const messages = buildConversationMessages(history, "new", 5);
      // 5 from history + 1 new = 6
      expect(messages).toHaveLength(6);
    });

    it("should skip SYSTEM role messages", () => {
      const history = [
        { role: "SYSTEM" as const, content: "System note" },
        { role: "USER" as const, content: "Hi" },
      ];
      const messages = buildConversationMessages(history, "Hey");
      expect(messages).toHaveLength(2); // user "Hi" + user "Hey"
    });
  });

  describe("buildProactivePrompt", () => {
    it("should build morning prompt", () => {
      const result = buildProactivePrompt("morning", mockAura, mockUser);
      expect(result.systemPrompt).toContain("Aura");
      expect(result.messages[0]!.content).toContain("morning");
    });

    it("should build check_in prompt", () => {
      const result = buildProactivePrompt("check_in", mockAura, mockUser);
      expect(result.messages[0]!.content).toContain("check-in");
    });

    it("should build evening prompt", () => {
      const result = buildProactivePrompt("evening", mockAura, mockUser);
      expect(result.messages[0]!.content).toContain("evening");
    });
  });
});
