import type { Request } from "express";
import { ApiError } from "./ApiError";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export const getMeta = (req: Request): RequestMeta => ({
  ip: req.ip,
  userAgent: req.get("user-agent") ?? undefined,
});

export function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}