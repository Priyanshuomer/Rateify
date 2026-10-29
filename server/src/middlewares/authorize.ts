import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError";

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires one of the following roles: ${roles.join(", ")}`, "ROLE_FORBIDDEN"));
    }
    next();
  };