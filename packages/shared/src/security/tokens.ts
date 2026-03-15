import * as jose from "jose";

export interface TokenPayload {
  sub: string;
  plan: string;
  type: "access" | "refresh";
}

function getSecrets(): { jwtSecret: string; refreshSecret: string } {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !refreshSecret) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set");
  }
  return { jwtSecret, refreshSecret };
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function generateAccessToken(payload: { sub: string; plan: string }): Promise<string> {
  const { jwtSecret } = getSecrets();
  const { randomUUID } = await import("crypto");
  return new jose.SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime("15m")
    .setIssuer("aura")
    .setAudience("aura-api")
    .sign(encodeSecret(jwtSecret));
}

export async function generateRefreshToken(payload: {
  sub: string;
  plan: string;
}): Promise<string> {
  const { refreshSecret } = getSecrets();
  const { randomUUID } = await import("crypto");
  return new jose.SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime("7d")
    .setIssuer("aura")
    .setAudience("aura-api")
    .sign(encodeSecret(refreshSecret));
}

export async function verifyAccessToken(token: string): Promise<TokenPayload & jose.JWTPayload> {
  const { jwtSecret } = getSecrets();
  const { payload } = await jose.jwtVerify(token, encodeSecret(jwtSecret), {
    issuer: "aura",
    audience: "aura-api",
  });
  return payload as TokenPayload & jose.JWTPayload;
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload & jose.JWTPayload> {
  const { refreshSecret } = getSecrets();
  const { payload } = await jose.jwtVerify(token, encodeSecret(refreshSecret), {
    issuer: "aura",
    audience: "aura-api",
  });
  return payload as TokenPayload & jose.JWTPayload;
}

export async function generateTokenPair(payload: {
  sub: string;
  plan: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload),
  ]);
  return { accessToken, refreshToken };
}
