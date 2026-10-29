import { env } from "../config/env";
import * as authService from "../services/auth.service";
import * as profileService from "../services/profile.service";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from "../utils/cookies";
import { getMeta, requireUser } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";

export const signup = asyncHandler(async (req, res) => {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
  await authService.signup(req.body, {
    ownerImage: files.ownerImage?.[0],
    storeLogo: files.storeLogo?.[0],
  });
  sendSuccess(res, null, "Verification email sent. Open the link in your inbox to complete registration.", 202);
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.body.email);
  sendSuccess(res, null, "If a pending registration exists for this email, a new verification link has been sent.");
});

export const verifyEmail = asyncHandler(async (req, res) => {
  try {
    await authService.verifyEmail(String(req.query.token));
  } catch (err) {
    // Browser click-through: send people to the frontend instead of showing raw JSON
    if (env.FRONTEND_URL && err instanceof ApiError) {
      return res.redirect(`${env.FRONTEND_URL}/login?verified=0&reason=${encodeURIComponent(err.code)}`);
    }
    throw err;
  }

  if (env.FRONTEND_URL) return res.redirect(`${env.FRONTEND_URL}/login?verified=1`);
  sendSuccess(res, { verified: true }, "Email verified. Your account has been created — you can now log in.");
});

export const login = asyncHandler(async (req, res) => {
  const { refreshTokenExpiresAt, ...result } = await authService.login(
    req.body.email,
    req.body.password,
    getMeta(req),
    req.body.role,
  );
  setRefreshCookie(res, result.refreshToken, refreshTokenExpiresAt);
  sendSuccess(res, result, "Login successful");
});

export const refresh = asyncHandler(async (req, res) => {
  const raw: string | undefined = req.body.refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) throw ApiError.unauthorized("Refresh token missing", "REFRESH_TOKEN_MISSING");

  const { refreshTokenExpiresAt, ...result } = await authService.refresh(raw, getMeta(req));
  setRefreshCookie(res, result.refreshToken, refreshTokenExpiresAt);
  sendSuccess(res, result, "Token refreshed");
});

export const logout = asyncHandler(async (req, res) => {
  const raw: string | undefined = req.body?.refreshToken ?? req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(raw, req.user?.id, req.ip);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out");
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(requireUser(req).id, req.ip);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out from all devices");
});

export const changePassword = asyncHandler(async (req, res) => {
  const { refreshTokenExpiresAt, ...tokens } = await authService.changePassword(
    requireUser(req).id,
    req.body.currentPassword,
    req.body.newPassword,
    getMeta(req),
  );
  setRefreshCookie(res, tokens.refreshToken, refreshTokenExpiresAt);
  sendSuccess(res, tokens, "Password updated. Other devices have been signed out.");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, null, "If an account exists for this email, a reset link has been sent.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword, getMeta(req));
  sendSuccess(res, null, "Password reset successful. You can now log in.");
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.getProfile(requireUser(req).id), "Current user");
});