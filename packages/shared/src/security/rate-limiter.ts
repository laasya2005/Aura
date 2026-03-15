import type { Redis } from "ioredis";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

export async function checkRateLimit(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const prefix = config.keyPrefix ?? "rl";
  const redisKey = `${prefix}:${key}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const member = `${now}:${Math.random()}`;

  // Sliding window using sorted set
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zcard(redisKey); // count BEFORE adding
  pipeline.pexpire(redisKey, config.windowMs);

  const results = await pipeline.exec();
  if (!results) {
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
      retryAfterMs: 0,
    };
  }

  const currentCount = (results[1]?.[1] as number) ?? 0;
  const allowed = currentCount < config.maxRequests;

  if (allowed) {
    // Only add the member if the request is allowed
    await redis.zadd(redisKey, now.toString(), member);
  }

  const remaining = Math.max(0, config.maxRequests - currentCount - (allowed ? 1 : 0));
  const resetAt = new Date(now + config.windowMs);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfterMs: allowed ? 0 : config.windowMs,
  };
}

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: "rl:auth" },
  api: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: "rl:api" },
  sms: { windowMs: 60 * 1000, maxRequests: 10, keyPrefix: "rl:sms" },
  voice: { windowMs: 60 * 60 * 1000, maxRequests: 5, keyPrefix: "rl:voice" },
} as const satisfies Record<string, RateLimitConfig>;
