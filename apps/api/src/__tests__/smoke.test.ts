import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { buildServer } from "../app.js";

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
    MEMORY_SUMMARY: "ms",
    STREAK_UPDATE: "su",
  },
}));

const TEST_EMAIL = `test-smoke-${Date.now()}@aura.app`;
const TEST_PASSWORD = "testpassword123";

describe("Smoke Tests — Full API Flow", () => {
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

  it("full auth → profile → goal → conversation flow", async () => {
    // 1. Register
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(registerRes.statusCode).toBe(201);
    const { accessToken } = registerRes.json().data;
    expect(accessToken).toBeDefined();

    const headers = { authorization: `Bearer ${accessToken}` };

    // 2. Get user profile
    const meRes = await app.inject({
      method: "GET",
      url: "/users/me",
      headers,
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().data.email).toBeDefined();

    // 3. Create a goal
    const goalRes = await app.inject({
      method: "POST",
      url: "/goals",
      headers,
      payload: { title: "Smoke Test Goal", category: "FITNESS" },
    });
    expect(goalRes.statusCode).toBe(201);
    const goalId = goalRes.json().data.id;

    // 4. List goals
    const goalsRes = await app.inject({
      method: "GET",
      url: "/goals?status=ACTIVE",
      headers,
    });
    expect(goalsRes.statusCode).toBe(200);
    expect(goalsRes.json().data.length).toBeGreaterThanOrEqual(1);

    // 5. Record streak
    const streakRes = await app.inject({
      method: "POST",
      url: `/goals/${goalId}/streak`,
      headers,
    });
    expect(streakRes.statusCode).toBe(200);

    // 6. Get Aura profile
    const auraRes = await app.inject({
      method: "GET",
      url: "/aura/profile",
      headers,
    });
    expect(auraRes.statusCode).toBe(200);

    // 7. Login with same credentials
    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(loginRes.statusCode).toBe(200);

    // 8. Refresh token via cookie
    const cookies = loginRes.cookies as Array<{ name: string; value: string }>;
    const refreshCookie = cookies.find((c) => c.name === "aura_refresh");
    if (refreshCookie) {
      const refreshRes = await app.inject({
        method: "POST",
        url: "/auth/refresh",
        cookies: { aura_refresh: refreshCookie.value },
      });
      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.json().data.accessToken).toBeDefined();
    }

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
