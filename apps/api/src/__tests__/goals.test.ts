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

const TEST_PHONE = "+15559990001";

async function getAccessToken(app: ReturnType<typeof buildServer>): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/otp/verify",
    payload: { phone: TEST_PHONE, code: "123456" },
  });
  return res.json().data.accessToken;
}

describe("Goals Routes", () => {
  let app: ReturnType<typeof buildServer>;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-min-32-characters!!";
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || "test-refresh-secret-min-32-chars!!";
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || "postgresql://aura:aura_dev_password@localhost:5432/aura_dev";
    process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

    app = buildServer();
    await app.ready();
    token = await getAccessToken(app);

    // Clean up any leftover goals from prior test runs
    const user = await app.prisma.user.findUnique({ where: { phone: TEST_PHONE } });
    if (user) {
      await app.prisma.goal.deleteMany({ where: { userId: user.id } });
    }
  });

  afterAll(async () => {
    // Clean up goals created during tests
    const user = await app.prisma.user.findUnique({ where: { phone: TEST_PHONE } });
    if (user) {
      await app.prisma.goal.deleteMany({ where: { userId: user.id } });
    }
    await app.close();
  });

  it("should create a goal", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/goals",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Test Goal", category: "FITNESS" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.title).toBe("Test Goal");
  });

  it("should list goals", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/goals?status=ACTIVE",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().data)).toBe(true);
  });

  it("should reject goal creation without auth", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/goals",
      payload: { title: "No Auth", category: "FITNESS" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("should reject invalid category", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/goals",
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Bad Cat", category: "INVALID" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("should record a streak", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/goals?status=ACTIVE",
      headers: { authorization: `Bearer ${token}` },
    });
    const goals = listRes.json().data;
    const goalId = goals[0]?.id;

    if (!goalId) {
      // Create a goal first if none exist
      const createRes = await app.inject({
        method: "POST",
        url: "/goals",
        headers: { authorization: `Bearer ${token}` },
        payload: { title: "Streak Goal", category: "HEALTH" },
      });
      const newGoalId = createRes.json().data.id;
      const res = await app.inject({
        method: "POST",
        url: `/goals/${newGoalId}/streak`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.goal.currentStreak).toBeGreaterThanOrEqual(1);
    } else {
      const res = await app.inject({
        method: "POST",
        url: `/goals/${goalId}/streak`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.goal.currentStreak).toBeGreaterThanOrEqual(1);
    }
  });

  it("should delete a goal", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/goals?status=ACTIVE",
      headers: { authorization: `Bearer ${token}` },
    });
    const goals = listRes.json().data;
    const goalId = goals[0]?.id;
    expect(goalId).toBeDefined();

    const res = await app.inject({
      method: "DELETE",
      url: `/goals/${goalId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
