import { describe, it, expect } from "vitest";
import { isValidE164, sanitizeString, sanitizeInput } from "../security/sanitize.js";

describe("Security Tests", () => {
  describe("Input Sanitization", () => {
    it("should escape HTML entities", () => {
      const result = sanitizeString("<script>alert('xss')</script>Hello");
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    it("should escape event handler attributes", () => {
      const result = sanitizeString('<img onerror="alert(1)" src="x">');
      expect(result).not.toContain("<img");
      expect(result).toContain("&lt;img");
    });

    it("should preserve safe text", () => {
      expect(sanitizeString("Hello, world!")).toBe("Hello, world!");
    });

    it("should handle nested injection attempts", () => {
      const input = '"><script>alert(1)</script><input value="';
      const result = sanitizeString(input);
      expect(result).not.toContain("<script>");
    });

    it("should trim and truncate general input", () => {
      const result = sanitizeInput("  Hello World  ");
      expect(result).toBe("Hello World");
    });

    it("should enforce max length", () => {
      const longInput = "a".repeat(20000);
      const result = sanitizeInput(longInput, 100);
      expect(result.length).toBe(100);
    });
  });

  describe("Phone Validation", () => {
    it("should accept valid E.164 phones", () => {
      expect(isValidE164("+15551234567")).toBe(true);
      expect(isValidE164("+442071234567")).toBe(true);
      expect(isValidE164("+8613800138000")).toBe(true);
    });

    it("should reject invalid phones", () => {
      expect(isValidE164("5551234567")).toBe(false);
      expect(isValidE164("+0123")).toBe(false);
      expect(isValidE164("not-a-phone")).toBe(false);
      expect(isValidE164("")).toBe(false);
    });

    it("should reject phones with letters", () => {
      expect(isValidE164("+1555ABC4567")).toBe(false);
    });

    it("should reject SQL injection in phone", () => {
      expect(isValidE164("'; DROP TABLE users; --")).toBe(false);
    });
  });
});
