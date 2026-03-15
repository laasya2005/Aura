import type { Redis } from "ioredis";

const PREFIX = "bl:token:";
const REFRESH_PREFIX = "rf:family:";

export class TokenBlacklist {
  constructor(private redis: Redis) {}

  /** Blacklist an access token until its expiry */
  async blacklistAccess(jti: string, expiresInSec: number): Promise<void> {
    await this.redis.setex(`${PREFIX}${jti}`, expiresInSec, "1");
  }

  /** Check if an access token is blacklisted */
  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`${PREFIX}${jti}`);
    return result !== null;
  }

  /**
   * Store a refresh token in a family for rotation tracking.
   * family = userId, member = token JTI
   * If we see a used token reused, all tokens in the family are revoked.
   */
  async storeRefreshToken(userId: string, jti: string, expiresInSec: number): Promise<void> {
    const key = `${REFRESH_PREFIX}${userId}`;
    await this.redis.pipeline().hset(key, jti, "valid").expire(key, expiresInSec).exec();
  }

  /** Mark a refresh token as used (rotated) */
  async markRefreshUsed(userId: string, jti: string): Promise<void> {
    await this.redis.hset(`${REFRESH_PREFIX}${userId}`, jti, "used");
  }

  /** Check if a refresh token is valid (not used, not revoked) */
  async isRefreshValid(userId: string, jti: string): Promise<"valid" | "used" | "unknown"> {
    const status = await this.redis.hget(`${REFRESH_PREFIX}${userId}`, jti);
    if (status === "valid") return "valid";
    if (status === "used") return "used";
    return "unknown";
  }

  /** Revoke all refresh tokens for a user (e.g., on reuse detection or logout) */
  async revokeAllRefresh(userId: string): Promise<void> {
    await this.redis.del(`${REFRESH_PREFIX}${userId}`);
  }
}
