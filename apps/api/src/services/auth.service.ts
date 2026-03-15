import type { PrismaClient } from "@aura/db";
import type { Redis } from "ioredis";
import {
  generateTokenPair,
  verifyRefreshToken,
  AppError,
  ErrorCode,
  type AuditLogger,
  AuditActions,
} from "@aura/shared";
import { sendOtp, checkOtp } from "@aura/comms";
import { TokenBlacklist } from "./token-blacklist.js";

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export class AuthService {
  private blacklist: TokenBlacklist;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private audit: AuditLogger
  ) {
    this.blacklist = new TokenBlacklist(redis);
  }

  async sendOtp(phone: string, ip?: string): Promise<{ success: boolean }> {
    // Rate limit: max 5 OTP requests per phone per 15 minutes (atomic incr+expire)
    const rateLimitKey = `otp:rl:${phone}`;
    const attempts = (await this.redis.eval(
      `local c = redis.call('incr', KEYS[1])
       if c == 1 then redis.call('expire', KEYS[1], ARGV[1]) end
       return c`,
      1,
      rateLimitKey,
      900
    )) as number;
    if (attempts > 5) {
      throw new AppError(
        ErrorCode.OTP_RATE_LIMITED,
        "Too many OTP requests. Try again later.",
        429
      );
    }

    await sendOtp(phone);

    await this.audit({
      action: AuditActions.OTP_SENT,
      resource: "auth",
      metadata: { phone: phone.slice(-4) }, // Only last 4 digits for audit
      ipAddress: ip,
    });

    return { success: true };
  }

  async verifyOtp(
    phone: string,
    code: string,
    ip?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; plan: string; isNew: boolean; status: string; firstName?: string };
  }> {
    const result = await checkOtp(phone, code);

    if (!result.valid) {
      await this.audit({
        action: AuditActions.OTP_FAILED,
        resource: "auth",
        metadata: { phone: phone.slice(-4) },
        ipAddress: ip,
      });
      throw new AppError(ErrorCode.INVALID_OTP, "Invalid or expired verification code", 401);
    }

    // Find or create user
    let isNew = false;
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      isNew = true;
      user = await this.prisma.user.create({
        data: {
          phone,
          status: "ONBOARDING",
          plan: "FREE",
        },
      });

      await this.audit({
        userId: user.id,
        action: AuditActions.USER_CREATED,
        resource: "user",
        resourceId: user.id,
        ipAddress: ip,
      });
    }

    // Update last active
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate tokens
    const tokens = await generateTokenPair({ sub: user.id, plan: user.plan });

    // Store refresh token JTI in family for rotation tracking
    const refreshJti = this.extractJti(tokens.refreshToken);
    await this.blacklist.storeRefreshToken(user.id, refreshJti, REFRESH_TOKEN_TTL);

    await this.audit({
      userId: user.id,
      action: AuditActions.LOGIN,
      resource: "auth",
      ipAddress: ip,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        plan: user.plan,
        isNew,
        status: user.status,
        firstName: user.firstName ?? undefined,
      },
    };
  }

  async refresh(
    refreshToken: string,
    ip?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Invalid refresh token");
    }

    const userId = payload.sub;
    const oldJti = payload.jti;
    if (!oldJti) {
      throw AppError.unauthorized("Malformed refresh token");
    }

    // Check token family status
    const status = await this.blacklist.isRefreshValid(userId, oldJti);
    if (status === "used") {
      // Reuse detection! Someone is replaying an old refresh token.
      // Revoke the entire family to force re-authentication.
      await this.blacklist.revokeAllRefresh(userId);
      await this.audit({
        userId,
        action: "auth.token.reuse_detected",
        resource: "auth",
        ipAddress: ip,
        metadata: { severity: "high" },
      });
      throw AppError.unauthorized("Token reuse detected. Please log in again.");
    }

    if (status === "unknown") {
      throw AppError.unauthorized("Refresh token not recognized");
    }

    // Mark old token as used
    await this.blacklist.markRefreshUsed(userId, oldJti);

    // Get current user plan (may have changed)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, status: true },
    });

    if (!user || user.status === "DELETED") {
      throw AppError.unauthorized("User account not found");
    }

    // Generate new token pair
    const tokens = await generateTokenPair({ sub: userId, plan: user.plan });

    // Store new refresh token JTI
    const newJti = this.extractJti(tokens.refreshToken);
    await this.blacklist.storeRefreshToken(userId, newJti, REFRESH_TOKEN_TTL);

    await this.audit({
      userId,
      action: AuditActions.TOKEN_REFRESH,
      resource: "auth",
      ipAddress: ip,
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string, ip?: string): Promise<void> {
    // Revoke all refresh tokens for this user
    await this.blacklist.revokeAllRefresh(userId);

    await this.audit({
      userId,
      action: AuditActions.LOGOUT,
      resource: "auth",
      ipAddress: ip,
    });
  }

  /** Extract the JTI claim from a JWT without full verification (already verified above). */
  private extractJti(token: string): string {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) throw new Error("Invalid JWT format");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as { jti?: string };
    if (!payload.jti) throw new Error("Token missing JTI claim");
    return payload.jti;
  }
}
