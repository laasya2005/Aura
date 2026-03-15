import { describe, it, expect } from "vitest";
import { detectCrisis } from "../crisis-detector.js";

describe("Crisis Detector", () => {
  describe("high severity", () => {
    it("should detect suicidal ideation", () => {
      const result = detectCrisis("I want to kill myself");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("high");
      expect(result.responseOverride).toContain("988");
    });

    it("should detect 'end my life'", () => {
      const result = detectCrisis("I just want to end my life");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("high");
    });

    it("should detect 'want to die'", () => {
      const result = detectCrisis("I want to die");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("high");
    });

    it("should detect self-harm mention", () => {
      const result = detectCrisis("I've been cutting myself");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("high");
    });
  });

  describe("low severity", () => {
    it("should detect hopelessness", () => {
      const result = detectCrisis("Everything is hopeless");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("low");
      expect(result.responseOverride).toContain("988");
    });

    it("should detect 'can't take it anymore'", () => {
      const result = detectCrisis("I can't take it anymore");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("low");
    });

    it("should detect 'better off without me'", () => {
      const result = detectCrisis("Everyone would be better off without me");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("low");
    });
  });

  describe("no crisis", () => {
    it("should not flag normal messages", () => {
      const result = detectCrisis("I had a great day at work!");
      expect(result.detected).toBe(false);
      expect(result.severity).toBe("none");
    });

    it("should not flag goal-related frustration", () => {
      const result = detectCrisis("I missed my workout today, feeling lazy");
      expect(result.detected).toBe(false);
      expect(result.severity).toBe("none");
    });

    it("should not flag metaphorical language", () => {
      const result = detectCrisis("This deadline is killing me");
      expect(result.detected).toBe(false);
      expect(result.severity).toBe("none");
    });
  });
});
