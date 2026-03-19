import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../app.js";

const TEST_EMAIL = `test-auth-${Date.now()}@aura.app`;
const TEST_PASSWORD = "testpassword123";

describe("Auth Routes", () => {
  let app: ReturnType<typeof buildServer>;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-min-32-characters!!";
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || "test-refresh-secret-min-32-chars!!";
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || "postgresql://aura:aura_dev_password@localhost:5432/aura_dev";
    process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/register", () => {
    it("should register with valid email and password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.id).toBeDefined();
    });

    it("should reject duplicate email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(409);
    });

    it("should reject invalid email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "invalid", password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject short password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: "new@test.com", password: "short" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    it("should login with correct credentials", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.id).toBeDefined();
    });

    it("should reject wrong password", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAIL, password: "wrongpassword" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "noone@test.com", password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should refresh tokens with valid refresh token", async () => {
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
      });

      const cookies = loginResponse.cookies as Array<{ name: string; value: string }>;
      const refreshCookie = cookies.find((c) => c.name === "aura_refresh");

      const response = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: refreshCookie ? { aura_refresh: refreshCookie.value } : {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.accessToken).toBeDefined();
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
      const loginResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
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
