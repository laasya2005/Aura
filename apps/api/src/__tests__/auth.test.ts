import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { buildServer } from "../app.js";

// Mock Twilio verify module
vi.mock("@aura/comms", () => ({
  sendOtp: vi.fn().mockResolvedValue({ success: true, sid: "mock-sid" }),
  checkOtp: vi.fn().mockResolvedValue({ valid: true, status: "approved" }),
}));

import { sendOtp, checkOtp } from "@aura/comms";

const TEST_PHONE = "+15559876543";

describe("Auth Routes", () => {
  let app: ReturnType<typeof buildServer>;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret-min-32-characters!!";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars!!";
    process.env.DATABASE_URL = "postgresql://aura:aura_dev_password@localhost:5432/aura_dev";
    process.env.REDIS_URL = "redis://localhost:6379";

    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default success behavior
    vi.mocked(checkOtp).mockResolvedValue({ valid: true, status: "approved" });
  });

  describe("POST /auth/otp/send", () => {
    it("should send OTP for valid phone", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/send",
        payload: { phone: TEST_PHONE },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(sendOtp).toHaveBeenCalledWith(TEST_PHONE);
    });

    it("should reject invalid phone number", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/send",
        payload: { phone: "invalid" },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject missing phone", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/send",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /auth/otp/verify", () => {
    it("should verify OTP and return tokens", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/verify",
        payload: { phone: TEST_PHONE, code: "123456" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user.id).toBeDefined();
      expect(checkOtp).toHaveBeenCalledWith(TEST_PHONE, "123456");
    });

    it("should reject invalid OTP", async () => {
      vi.mocked(checkOtp).mockResolvedValueOnce({ valid: false, status: "pending" });

      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/verify",
        payload: { phone: TEST_PHONE, code: "000000" },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe("INVALID_OTP");
    });

    it("should reject invalid code format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/otp/verify",
        payload: { phone: TEST_PHONE, code: "abc" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should refresh tokens with valid refresh token", async () => {
      // Login to get tokens
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/otp/verify",
        payload: { phone: TEST_PHONE, code: "123456" },
      });

      const { refreshToken } = loginResponse.json().data;

      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it("should reject reused refresh token (rotation)", async () => {
      // Use a unique phone to avoid cross-test pollution
      const uniquePhone = "+15551112222";

      // Login to get tokens
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/otp/verify",
        payload: { phone: uniquePhone, code: "123456" },
      });
      const { refreshToken } = loginResponse.json().data;

      // First refresh — should succeed and mark the old token as "used"
      const firstRefresh = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });
      expect(firstRefresh.statusCode).toBe(200);

      // Second refresh with the SAME old token — reuse detection should kick in
      const secondRefresh = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken },
      });

      // Should fail: token was already used (reuse detection)
      expect(secondRefresh.statusCode).toBe(401);
    });

    it("should reject invalid refresh token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        payload: { refreshToken: "invalid-token" },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /auth/logout", () => {
    it("should logout with valid access token", async () => {
      // Login first
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/otp/verify",
        payload: { phone: TEST_PHONE, code: "123456" },
      });
      const { accessToken } = loginResponse.json().data;

      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it("should reject logout without auth", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/logout",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
