import type { Response } from "express";
import { env, isProd } from "../config/env";

const COOKIE_NAME = "refreshToken";

export function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "strict" : "lax",
    path: "/api/auth",
    expires: expiresAt,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/api/auth" });
}

export const REFRESH_COOKIE_NAME = COOKIE_NAME;