import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { AppError } from "@aura/shared";

// Plugins
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import swaggerPlugin from "./plugins/swagger.js";
import metricsPlugin from "./plugins/metrics.js";
import { registerHelmet } from "./middleware/helmet.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import auraRoutes from "./routes/aura.js";
import goalRoutes from "./routes/goals.js";
import scheduleRoutes from "./routes/schedules.js";
import conversationRoutes from "./routes/conversations.js";
import webhookRoutes from "./routes/webhooks.js";
import adminRoutes from "./routes/admin.js";
import billingRoutes from "./routes/billing.js";
import groupRoutes from "./routes/groups.js";
import analyticsRoutes from "./routes/analytics.js";

// Middleware
import { requestIdMiddleware } from "./middleware/request-id.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    requestIdHeader: "x-request-id",
    bodyLimit: 1_048_576, // 1MB max request body
    requestTimeout: 30_000, // 30s timeout
  });

  // Capture raw body for webhook signature verification (Stripe)
  server.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body: Buffer, done) => {
      (req as unknown as { rawBody: Buffer }).rawBody = body;
      if (!body || body.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body.toString()));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Parse application/x-www-form-urlencoded (Twilio webhooks)
  server.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body: string, done) => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body));
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // --- Global hooks ---
  server.addHook("onRequest", requestIdMiddleware);

  // --- Plugins ---
  server.register(cors, {
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  });
  server.register(cookie);
  server.register(registerHelmet);
  server.register(prismaPlugin);
  server.register(redisPlugin);
  server.register(swaggerPlugin);
  server.register(metricsPlugin);

  // --- Health check ---
  server.get("/health", async () => {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await server.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }

    // Redis check
    try {
      await server.redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }

    const allHealthy = Object.values(checks).every((v) => v === "ok");

    return {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
    };
  });

  // --- Routes ---
  server.register(authRoutes);
  server.register(userRoutes);
  server.register(auraRoutes);
  server.register(goalRoutes);
  server.register(scheduleRoutes);
  server.register(conversationRoutes);
  server.register(webhookRoutes);
  server.register(adminRoutes);
  server.register(billingRoutes);
  server.register(groupRoutes);
  server.register(analyticsRoutes);

  // --- Error handler ---
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.validation,
        },
      });
    }

    server.log.error(error);
    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });

  // --- Not found handler ---
  server.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  return server;
}
