import { describe, it, expect } from "vitest";
import {
  isValidE164,
  normalizePhone,
  sanitizeString,
  stripControlChars,
  sanitizeInput,
  phoneSchema,
  emailSchema,
} from "../sanitize.js";

describe("phone validation", () => {
  it("should accept valid E.164 numbers", () => {
    expect(isValidE164("+15551234567")).toBe(true);
    expect(isValidE164("+442071234567")).toBe(true);
    expect(isValidE164("+81312345678")).toBe(true);
  });

  it("should reject invalid numbers", () => {
    expect(isValidE164("5551234567")).toBe(false);
    expect(isValidE164("+0551234567")).toBe(false);
    expect(isValidE164("")).toBe(false);
    expect(isValidE164("+")).toBe(false);
    expect(isValidE164("+1")).toBe(false); // too short for E.164
  });

  it("phoneSchema should validate", () => {
    expect(phoneSchema.safeParse("+15551234567").success).toBe(true);
    expect(phoneSchema.safeParse("invalid").success).toBe(false);
  });
});

describe("normalizePhone", () => {
  it("should add +1 to 10-digit US numbers", () => {
    expect(normalizePhone("5551234567")).toBe("+15551234567");
  });

  it("should add + to 11-digit numbers starting with 1", () => {
    expect(normalizePhone("15551234567")).toBe("+15551234567");
  });

  it("should strip formatting", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });

  it("should leave valid E.164 unchanged", () => {
    expect(normalizePhone("+15551234567")).toBe("+15551234567");
  });
});

describe("sanitizeString", () => {
  it("should escape HTML entities", () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  it("should escape ampersands", () => {
    expect(sanitizeString("A & B")).toBe("A &amp; B");
  });

  it("should escape single quotes", () => {
    expect(sanitizeString("it's")).toBe("it&#x27;s");
  });
});

describe("stripControlChars", () => {
  it("should remove control characters", () => {
    expect(stripControlChars("hello\x00world")).toBe("helloworld");
    expect(stripControlChars("test\x1Fdata")).toBe("testdata");
  });

  it("should keep newlines and tabs", () => {
    expect(stripControlChars("hello\nworld\ttab")).toBe("hello\nworld\ttab");
  });
});

describe("sanitizeInput", () => {
  it("should trim whitespace", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("should truncate long strings", () => {
    const long = "x".repeat(200);
    expect(sanitizeInput(long, 100)).toHaveLength(100);
  });

  it("should strip control chars", () => {
    expect(sanitizeInput("hello\x00world")).toBe("helloworld");
  });
});

describe("emailSchema", () => {
  it("should accept valid emails", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
  });

  it("should lowercase emails", () => {
    expect(emailSchema.parse("Test@Example.COM")).toBe("test@example.com");
  });

  it("should reject invalid emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});
