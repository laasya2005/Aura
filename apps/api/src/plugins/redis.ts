import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (server: FastifyInstance) => {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

  redis.on("error", (err) => {
    server.log.error({ err }, "Redis connection error");
  });

  redis.on("connect", () => {
    server.log.info("Redis connected");
  });

  server.decorate("redis", redis);

  server.addHook("onClose", async () => {
    await redis.quit();
    server.log.info("Redis disconnected");
  });
});
