import { createHash, randomBytes } from "crypto";
import type { Role } from "@prisma/client";
import { env } from "../config/env";
import prisma from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { signAccessToken } from "../utils/jwt";
import type { RequestMeta } from "../utils/requestContext";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function issueTokens(user: { id: string; email: string; role: Role }, meta: RequestMeta) {
  const refreshToken = randomBytes(48).toString("hex");
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: user.id,
      expiresAt: refreshTokenExpiresAt,
      ipAddress: meta.ip,
      userAgent: meta.userAgent?.slice(0, 255),
    },
  });

  return { accessToken: signAccessToken(user), refreshToken, refreshTokenExpiresAt };
}

/** Rotation: each refresh token is single-use. Re-use of a revoked token revokes the whole family. */
export async function rotateRefreshToken(rawToken: string, meta: RequestMeta) {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });

  if (!record) throw ApiError.unauthorized("Invalid refresh token", "REFRESH_TOKEN_INVALID");

  if (record.revokedAt) {
    await revokeAllUserTokens(record.userId);
    throw ApiError.unauthorized("Refresh token reuse detected. Please log in again.", "REFRESH_TOKEN_REUSED");
  }
  if (record.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired. Please log in again.", "REFRESH_TOKEN_EXPIRED");
  }
  if (record.user.deletedAt || record.user.status !== "ACTIVE") {
    throw ApiError.forbidden("Account is not active", "ACCOUNT_INACTIVE");
  }

  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  const tokens = await issueTokens(record.user, meta);
  return { user: record.user, ...tokens };
}

export async function revokeRefreshToken(rawToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}