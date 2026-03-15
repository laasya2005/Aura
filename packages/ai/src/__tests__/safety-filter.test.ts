import { describe, it, expect } from "vitest";
import { checkSafety } from "../safety-filter.js";

describe("Safety Filter", () => {
  it("should pass safe content", () => {
    const result = checkSafety("Great job on hitting your goal today! Keep it up!");
    expect(result.safe).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("should flag financial advice", () => {
    const result = checkSafety("You should buy crypto right now, prices are low");
    expect(result.safe).toBe(false);
    expect(result.flags).toContain("financial_advice");
  });

  it("should flag medical advice", () => {
    const result = checkSafety("You should stop taking your medication");
    expect(result.safe).toBe(false);
    expect(result.flags).toContain("medical_advice");
  });

  it("should flag identity claims", () => {
    const result = checkSafety("I am a human just like you");
    expect(result.safe).toBe(false);
    expect(result.flags).toContain("identity_claim");
  });

  it("should flag PII solicitation", () => {
    const result = checkSafety("What is your social security number?");
    expect(result.safe).toBe(false);
    expect(result.flags).toContain("pii_solicitation");
  });

  it("should soften directive medical referrals", () => {
    const result = checkSafety("You must see a doctor about this");
    expect(result.flags).toContain("directive_medical_referral");
  });
});
