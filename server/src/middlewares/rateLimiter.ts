import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooManyRequests()),
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) =>
    next(ApiError.tooManyRequests("Too many attempts, please wait a moment and try again", "AUTH_RATE_LIMITED")),
});