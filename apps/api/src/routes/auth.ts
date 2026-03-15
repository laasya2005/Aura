import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema, AppError } from "@aura/shared";
import { AuthService } from "../services/auth.service.js";
import { buildAuditLogger } from "../services/audit.service.js";
import { authMiddleware } from "../middleware/auth.js";
import { createRateLimitMiddleware, RATE_LIMITS } from "../middleware/rate-limit.js";

export default async function authRoutes(server: FastifyInstance) {
  const audit = buildAuditLogger(server.prisma);
  const authService = new AuthService(server.prisma, server.redis, audit);
  const authRateLimit = createRateLimitMiddleware(server.redis, RATE_LIMITS.auth);

  // POST /auth/otp/send
  server.post(
    "/auth/otp/send",
    { preHandler: [authRateLimit] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = sendOtpSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.validation("Invalid phone number", parsed.error.flatten());
      }

      const result = await authService.sendOtp(parsed.data.phone, request.ip);

      return reply.status(200).send({
        success: true,
        data: { message: "Verification code sent" },
      });
    }
  );

  // POST /auth/otp/verify
  server.post(
    "/auth/otp/verify",
    { preHandler: [authRateLimit] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = verifyOtpSchema.safeParse(request.body);
      if (!parsed.success) {
        throw AppError.validation("Invalid input", parsed.error.flatten());
      }

      const result = await authService.verifyOtp(parsed.data.phone, parsed.data.code, request.ip);

      // Set refresh token as httpOnly cookie
      reply.setCookie("aura_refresh", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/auth",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

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
    // Read refresh token from httpOnly cookie, fall back to body for backward compat
    const cookieToken = request.cookies?.aura_refresh;
    const bodyParsed = refreshTokenSchema.safeParse(request.body);
    const refreshToken = cookieToken ?? bodyParsed.data?.refreshToken;

    if (!refreshToken) {
      throw AppError.validation("Missing refresh token");
    }

    const tokens = await authService.refresh(refreshToken, request.ip);

    // Update the httpOnly cookie with the new refresh token
    reply.setCookie("aura_refresh", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/auth",
      maxAge: 7 * 24 * 60 * 60,
    });

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

      // Accept optional refresh token in body for targeted revocation
      const body = request.body as { refreshToken?: string } | undefined;
      const refreshToken = request.cookies?.aura_refresh ?? body?.refreshToken ?? "";
      await authService.logout(userId, refreshToken, request.ip);

      // Clear the refresh token cookie
      reply.clearCookie("aura_refresh", { path: "/auth" });

      return reply.status(200).send({
        success: true,
        data: { message: "Logged out successfully" },
      });
    }
  );
}
