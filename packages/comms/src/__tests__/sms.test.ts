import { describe, it, expect } from "vitest";
import { formatForSms, checkTcpaKeywords, isQuietHours } from "../twilio/sms.js";

describe("SMS Utilities", () => {
  describe("formatForSms", () => {
    it("should strip markdown bold", () => {
      expect(formatForSms("This is **bold** text")).toBe("This is bold text");
    });

    it("should strip markdown italic", () => {
      expect(formatForSms("This is *italic* text")).toBe("This is italic text");
    });

    it("should strip markdown headers", () => {
      expect(formatForSms("## Header\nContent")).toBe("Header\nContent");
    });

    it("should strip markdown links", () => {
      expect(formatForSms("[click here](https://example.com)")).toBe("click here");
    });

    it("should strip code blocks", () => {
      expect(formatForSms("Text ```code``` more")).toBe("Text  more");
    });

    it("should truncate to 1600 chars", () => {
      const long = "a".repeat(2000);
      expect(formatForSms(long).length).toBe(1600);
    });
  });

  describe("checkTcpaKeywords", () => {
    it("should detect STOP", () => {
      expect(checkTcpaKeywords("STOP")).toBe("stop");
      expect(checkTcpaKeywords("stop")).toBe("stop");
    });

    it("should detect HELP", () => {
      expect(checkTcpaKeywords("HELP")).toBe("help");
    });

    it("should detect other stop words", () => {
      expect(checkTcpaKeywords("unsubscribe")).toBe("stop");
      expect(checkTcpaKeywords("cancel")).toBe("stop");
      expect(checkTcpaKeywords("end")).toBe("stop");
      expect(checkTcpaKeywords("quit")).toBe("stop");
    });

    it("should return none for regular messages", () => {
      expect(checkTcpaKeywords("Hey how are you?")).toBe("none");
    });

    it("should only match exact single-word messages", () => {
      expect(checkTcpaKeywords("Please stop sending messages")).toBe("none");
    });
  });

  describe("isQuietHours", () => {
    it("should return a boolean", () => {
      const result = isQuietHours("America/New_York");
      expect(typeof result).toBe("boolean");
    });
  });
});
