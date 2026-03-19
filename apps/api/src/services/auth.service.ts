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
import bcrypt from "bcryptjs";
import { TokenBlacklist } from "./token-blacklist.js";

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const SALT_ROUNDS = 12;

export class AuthService {
  private blacklist: TokenBlacklist;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private audit: AuditLogger
  ) {
    this.blacklist = new TokenBlacklist(redis);
  }

  async register(
    email: string,
    password: string,
    ip?: string,
    firstName?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; plan: string; isNew: boolean; status: string; firstName?: string };
  }> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(ErrorCode.CONFLICT, "An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName ?? null,
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

    // Generate tokens
    const tokens = await generateTokenPair({ sub: user.id, plan: user.plan });
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
        isNew: true,
        status: user.status,
        firstName: user.firstName ?? undefined,
      },
    };
  }

  async login(
    email: string,
    password: string,
    ip?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; plan: string; isNew: boolean; status: string; firstName?: string };
  }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, "Invalid email or password", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await this.audit({
        userId: user.id,
        action: "auth.login.failed",
        resource: "auth",
        ipAddress: ip,
      });
      throw new AppError(ErrorCode.UNAUTHORIZED, "Invalid email or password", 401);
    }

    // Update last active
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate tokens
    const tokens = await generateTokenPair({ sub: user.id, plan: user.plan });
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
        isNew: false,
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
