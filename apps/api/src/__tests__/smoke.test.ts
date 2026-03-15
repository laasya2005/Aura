import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../app.js";

vi.mock("@aura/comms", () => ({
  sendOtp: vi.fn().mockResolvedValue({ success: true, sid: "mock-sid" }),
  checkOtp: vi.fn().mockResolvedValue({ valid: true, status: "approved" }),
}));

vi.mock("@aura/queue", () => ({
  addScheduleJob: vi.fn().mockResolvedValue("job-id"),
  removeScheduleJob: vi.fn().mockResolvedValue(undefined),
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

const TEST_PHONE = "+15559990099";

describe("Smoke Tests — Full API Flow", () => {
  let app: ReturnType<typeof buildServer>;

  beforeAll(async () => {
    process.env.JWT_SECRET = "test-jwt-secret-min-32-characters!!";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-32-chars!!";
    process.env.DATABASE_URL = "postgresql://aura:aura_dev_password@localhost:5432/aura_dev";
    process.env.REDIS_URL = "redis://localhost:6379";
    app = buildServer();
    await app.ready();

    // Clean up any leftover goals from prior runs
    const user = await app.prisma.user.findUnique({ where: { phone: TEST_PHONE } });
    if (user) {
      await app.prisma.goal.deleteMany({ where: { userId: user.id } });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("full auth → profile → goal → conversation flow", async () => {
    // 1. Send OTP
    const sendRes = await app.inject({
      method: "POST",
      url: "/auth/otp/send",
      payload: { phone: TEST_PHONE },
    });
    expect(sendRes.statusCode).toBe(200);

    // 2. Verify OTP → get tokens
    const verifyRes = await app.inject({
      method: "POST",
      url: "/auth/otp/verify",
      payload: { phone: TEST_PHONE, code: "123456" },
    });
    expect(verifyRes.statusCode).toBe(200);
    const { accessToken, refreshToken } = verifyRes.json().data;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    const headers = { authorization: `Bearer ${accessToken}` };

    // 3. Get user profile
    const meRes = await app.inject({
      method: "GET",
      url: "/users/me",
      headers,
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().data.phone).toBeDefined();

    // 4. Create a goal
    const goalRes = await app.inject({
      method: "POST",
      url: "/goals",
      headers,
      payload: { title: "Smoke Test Goal", category: "FITNESS" },
    });
    expect(goalRes.statusCode).toBe(201);
    const goalId = goalRes.json().data.id;

    // 5. List goals
    const goalsRes = await app.inject({
      method: "GET",
      url: "/goals?status=ACTIVE",
      headers,
    });
    expect(goalsRes.statusCode).toBe(200);
    expect(goalsRes.json().data.length).toBeGreaterThanOrEqual(1);

    // 6. Record streak
    const streakRes = await app.inject({
      method: "POST",
      url: `/goals/${goalId}/streak`,
      headers,
    });
    expect(streakRes.statusCode).toBe(200);

    // 7. Get Aura profile
    const auraRes = await app.inject({
      method: "GET",
      url: "/aura/profile",
      headers,
    });
    expect(auraRes.statusCode).toBe(200);

    // 8. Refresh token
    const refreshRes = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.json().data.accessToken).toBeDefined();

    // 9. Delete goal
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/goals/${goalId}`,
      headers,
    });
    expect(deleteRes.statusCode).toBe(200);

    // 10. Logout
    const logoutRes = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers,
      payload: { refreshToken },
    });
    expect(logoutRes.statusCode).toBe(200);
  });

  it("metrics endpoint returns prometheus format", async () => {
    const res = await app.inject({ method: "GET", url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
  });

  it("health check returns dependency status", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.uptime).toBeDefined();
    expect(body.checks).toBeDefined();
  });
});
