import type { NextFunction, Request, RequestHandler, Response } from "express";
import passport from "../config/passport";
import { env, googleEnabled } from "../config/env";
import * as authService from "../services/auth.service";
import { ApiError } from "../utils/ApiError";
import { getMeta } from "../utils/requestContext";
import { sendSuccess } from "../utils/response";

interface GoogleInfo {
  code?: string;
  message?: string;
  isNew?: boolean;
}

export const startGoogle =
  (strategy: "google-login" | "google-signup"): RequestHandler =>
  (req, res, next) => {
    if (!googleEnabled) {
      return next(ApiError.serviceUnavailable("Google authentication is not configured", "GOOGLE_NOT_CONFIGURED"));
    }
    passport.authenticate(strategy, { scope: ["email", "profile"], session: false, prompt: "select_account" })(req, res, next);
  };

export const finishGoogle =
  (strategy: "google-login" | "google-signup"): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!googleEnabled) {
      return next(ApiError.serviceUnavailable("Google authentication is not configured", "GOOGLE_NOT_CONFIGURED"));
    }

    passport.authenticate(strategy, { session: false }, (err: unknown, user: { id: string } | false, info?: GoogleInfo) => {
      void (async () => {
        try {
          if (err || !user) {
            const code = info?.code ?? (err ? "AUTH_FAILED" : "ACCESS_DENIED");
            const message = info?.message ?? "Google sign-in was not completed";

            if (env.FRONTEND_URL) {
              return res.redirect(
                `${env.FRONTEND_URL}/oauth/callback?error=${encodeURIComponent(code)}&message=${encodeURIComponent(message)}`,
              );
            }
            if (err) return next(err);
            return next(new ApiError(401, message, code));
          }

          const session = await authService.startSession(user.id, getMeta(req), "google");
          const isNew = info?.isNew === true;

          if (env.FRONTEND_URL) {
            // Tokens go in the URL *fragment*, which browsers never send to servers or proxies
            const fragment = new URLSearchParams({
              accessToken: session.accessToken,
              refreshToken: session.refreshToken,
              isNew: isNew ? "1" : "0",
            });
            return res.redirect(`${env.FRONTEND_URL}/oauth/callback#${fragment.toString()}`);
          }

          const { refreshTokenExpiresAt: _ignored, ...payload } = session;
          return sendSuccess(res, { ...payload, isNew }, "Google authentication successful");
        } catch (e) {
          next(e);
        }
      })();
    })(req, res, next);
  };