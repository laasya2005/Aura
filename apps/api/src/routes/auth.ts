import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { registerSchema, loginSchema, refreshTokenSchema, AppError } from "@aura/shared";
import { AuthService } from "../services/auth.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware, RATE_LIMITS } from "../middleware/rate-limit.js";

export default async function authRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const authService = new AuthService(server.prisma, server.redis, audit);
  const authRateLimit = createRateLimitMiddleware(server.redis, RATE_LIMITS.auth);

  function setRefreshCookie(reply: FastifyReply, token: string) {
    reply.setCookie("aura_refresh", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/auth",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  // POST /auth/register
  server.post(
    "/auth/register",
    { preHandler: [authRateLimit] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.validation("Invalid input", parsed.error.flatten());
      }

      const result = await authService.register(
        parsed.data.email,
        parsed.data.password,
        request.ip,
        parsed.data.firstName
      );

      setRefreshCookie(reply, result.refreshToken);

      return reply.status(201).send({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    }
  );

  // POST /auth/login
  server.post(
    "/auth/login",
    { preHandler: [authRateLimit] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.validation("Invalid input", parsed.error.flatten());
      }

      const result = await authService.login(parsed.data.email, parsed.data.password, request.ip);

      setRefreshCookie(reply, result.refreshToken);

      return reply.status(200).send({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    }
  );

  // POST /auth/refresh
  server.post("/auth/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    const cookieToken = request.cookies?.aura_refresh;
    const bodyParsed = refreshTokenSchema.safeParse(request.body);
    const refreshToken = cookieToken ?? bodyParsed.data?.refreshToken;

    if (!refreshToken) {
      throw AppError.validation("Missing refresh token");
    }

    const tokens = await authService.refresh(refreshToken, request.ip);

    setRefreshCookie(reply, tokens.refreshToken);

    return reply.status(200).send({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  });

  // POST /auth/logout (requires auth)
  server.post(
    "/auth/logout",
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.sub;
      const body = request.body as { refreshToken?: string } | undefined;
      const refreshToken = request.cookies?.aura_refresh ?? body?.refreshToken ?? "";
      await authService.logout(userId, refreshToken, request.ip);

      reply.clearCookie("aura_refresh", { path: "/auth" });

      return reply.status(200).send({
        success: true,
        data: { message: "Logged out successfully" },
      });
    }
  );
}
