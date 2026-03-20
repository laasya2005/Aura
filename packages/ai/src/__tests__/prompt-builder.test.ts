import { describe, it, expect } from "vitest";
import {
  buildSystemPrompt,
  buildConversationMessages,
  buildProactivePrompt,
  buildWeeklyReportPrompt,
  buildMonthlyReportPrompt,
} from "../prompt-builder.js";
import type { AuraContext, UserContext, WeeklyReportData, MonthlyReportData } from "../prompt-builder.js";

const mockAura: AuraContext = {
  mode: "GLOW",
};

const mockUser: UserContext = {
  userId: "user_abc123",
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
      expect(prompt).toContain("encouraging");
    });

    it("should include personality", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("PERSONALITY");
    });

    it("should include user context", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("Alex");
      expect(prompt).toContain("America/New_York");
      expect(prompt).toContain("paid plan");
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

    it("should say free plan for FREE users", () => {
      const freeUser: UserContext = { ...mockUser, plan: "FREE" };
      const prompt = buildSystemPrompt(mockAura, freeUser);
      expect(prompt).toContain("free plan");
      expect(prompt).not.toContain("FREE");
    });

    it("should say paid plan for non-FREE users without leaking tier name", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("paid plan");
      expect(prompt).not.toMatch(/plan tier is PRO/);
    });

    it("should include personalized pricing URL with user ID", () => {
      const prompt = buildSystemPrompt(mockAura, mockUser);
      expect(prompt).toContain("/pricing?uid=user_abc123");
      expect(prompt).not.toContain("{{USER_ID}}");
    });

    it("should URL-encode user ID in pricing URL", () => {
      const userWithSpecialChars: UserContext = {
        ...mockUser,
        userId: "id with spaces&chars=bad",
      };
      const prompt = buildSystemPrompt(mockAura, userWithSpecialChars);
      expect(prompt).toContain("/pricing?uid=id%20with%20spaces%26chars%3Dbad");
      expect(prompt).not.toContain("{{USER_ID}}");
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

  describe("buildWeeklyReportPrompt", () => {
    const weeklyData: WeeklyReportData = {
      goals: [
        { title: "Run 5K", category: "FITNESS", currentStreak: 7, status: "ACTIVE" },
        { title: "Read daily", category: "LEARNING", currentStreak: 3, status: "ACTIVE" },
      ],
      engagementDays: 5,
      totalDays: 7,
      completionRate: 71,
      streakHighlights: [
        { goalTitle: "Run 5K", streak: 7 },
        { goalTitle: "Read daily", streak: 3 },
      ],
    };

    it("should include goal data in the prompt", () => {
      const result = buildWeeklyReportPrompt(mockAura, mockUser, weeklyData);
      expect(result.messages[0]!.content).toContain("Run 5K");
      expect(result.messages[0]!.content).toContain("Read daily");
    });

    it("should include engagement summary", () => {
      const result = buildWeeklyReportPrompt(mockAura, mockUser, weeklyData);
      expect(result.messages[0]!.content).toContain("5 out of 7 days");
    });

    it("should use the correct system prompt", () => {
      const result = buildWeeklyReportPrompt(mockAura, mockUser, weeklyData);
      expect(result.systemPrompt).toContain("You are Aura");
      expect(result.systemPrompt).toContain("Alex");
    });

    it("should request iMessage-style format", () => {
      const result = buildWeeklyReportPrompt(mockAura, mockUser, weeklyData);
      expect(result.messages[0]!.content).toContain("3-5");
      expect(result.messages[0]!.content).toContain("iMessage");
    });
  });

  describe("buildMonthlyReportPrompt", () => {
    const monthlyData: MonthlyReportData = {
      goals: [
        { title: "Run 5K", category: "FITNESS", currentStreak: 21, status: "ACTIVE" },
      ],
      engagementDays: 22,
      totalDays: 30,
      completionRate: 73,
      streakHighlights: [{ goalTitle: "Run 5K", streak: 21 }],
      previousEngagementDays: 18,
      previousCompletionRate: 60,
      milestones: [{ goalTitle: "Run 5K", milestone: "2-week streak" }],
    };

    it("should include comparison data", () => {
      const result = buildMonthlyReportPrompt(mockAura, mockUser, monthlyData);
      const content = result.messages[0]!.content;
      expect(content).toContain("18 days");
      expect(content).toContain("60%");
      expect(content).toContain("improved");
    });

    it("should include milestones", () => {
      const result = buildMonthlyReportPrompt(mockAura, mockUser, monthlyData);
      expect(result.messages[0]!.content).toContain("2-week streak");
    });

    it("should use the correct system prompt", () => {
      const result = buildMonthlyReportPrompt(mockAura, mockUser, monthlyData);
      expect(result.systemPrompt).toContain("You are Aura");
      expect(result.systemPrompt).toContain("Alex");
    });

    it("should request 4-6 iMessage texts", () => {
      const result = buildMonthlyReportPrompt(mockAura, mockUser, monthlyData);
      expect(result.messages[0]!.content).toContain("4-6");
      expect(result.messages[0]!.content).toContain("iMessage");
    });
  });
});
