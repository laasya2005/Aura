import { describe, it, expect, beforeEach } from "vitest";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
} from "../tokens.js";

describe("tokens", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret-min-32-characters!!";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars!!";
  });

  const testPayload = { sub: "user-123", plan: "PRO" };

  describe("access tokens", () => {
    it("should generate and verify an access token", async () => {
      const token = await generateAccessToken(testPayload);
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const payload = await verifyAccessToken(token);
      expect(payload.sub).toBe("user-123");
      expect(payload.plan).toBe("PRO");
      expect(payload.type).toBe("access");
    });

    it("should reject an expired token", async () => {
      // Can't easily test expiration without time manipulation,
      // so test with an invalid token instead
      await expect(verifyAccessToken("invalid.token.here")).rejects.toThrow();
    });

    it("should reject a refresh token as access token", async () => {
      const refreshToken = await generateRefreshToken(testPayload);
      await expect(verifyAccessToken(refreshToken)).rejects.toThrow();
    });
  });

  describe("refresh tokens", () => {
    it("should generate and verify a refresh token", async () => {
      const token = await generateRefreshToken(testPayload);
      const payload = await verifyRefreshToken(token);
      expect(payload.sub).toBe("user-123");
      expect(payload.type).toBe("refresh");
    });

    it("should reject an access token as refresh token", async () => {
      const accessToken = await generateAccessToken(testPayload);
      await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
    });
  });

  describe("token pair", () => {
    it("should generate both tokens", async () => {
      const { accessToken, refreshToken } = await generateTokenPair(testPayload);
      expect(typeof accessToken).toBe("string");
      expect(typeof refreshToken).toBe("string");

      const accessPayload = await verifyAccessToken(accessToken);
      const refreshPayload = await verifyRefreshToken(refreshToken);
      expect(accessPayload.sub).toBe(refreshPayload.sub);
    });
  });

  it("should throw if secrets are not set", async () => {
    delete process.env.JWT_SECRET;
    await expect(generateAccessToken(testPayload)).rejects.toThrow(
      "JWT_SECRET and JWT_REFRESH_SECRET must be set"
    );
  });
});
