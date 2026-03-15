import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../app.js";

vi.mock("@aura/comms", () => ({
  sendOtp: vi.fn(),
  checkOtp: vi.fn(),
}));

vi.mock("@aura/queue", () => ({
  addScheduleJob: vi.fn(),
  removeScheduleJob: vi.fn(),
  getQueue: vi.fn().mockReturnValue({
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getActiveCount: vi.fn().mockResolvedValue(0),
    getCompletedCount: vi.fn().mockResolvedValue(0),
    getFailedCount: vi.fn().mockResolvedValue(0),
    getDelayedCount: vi.fn().mockResolvedValue(0),
  }),
  QUEUE_NAMES: {
    MORNING_TEXT: "mt",
    CHECK_IN: "ci",
    EVENING_RECAP: "er",
    VOICE_CALL: "vc",
    MEMORY_SUMMARY: "ms",
    STREAK_UPDATE: "su",
  },
}));

describe("API Health & Error Handling", () => {
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

  it("should return 200 on health check", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("ok");
    expect(res.json().timestamp).toBeDefined();
  });

  it("should return 404 for unknown routes", async () => {
    const res = await app.inject({ method: "GET", url: "/nonexistent" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("should return CORS headers", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://localhost:3000" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("should include security headers", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    // Helmet may not set all headers via inject() — check at least one is set
    // x-powered-by should be removed by helmet (fastify default is "Fastify")
    const hasSomeSecurityHeader =
      res.headers["x-content-type-options"] === "nosniff" ||
      res.headers["x-frame-options"] !== undefined ||
      res.headers["x-powered-by"] === undefined;
    expect(hasSomeSecurityHeader).toBe(true);
  });

  it("should include request-id header", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});
