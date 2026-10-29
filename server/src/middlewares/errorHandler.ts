import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import multer from "multer";
import { ZodError } from "zod";
import { isProd } from "../config/env";
import { logger } from "../lib/logger";
import { ApiError } from "../utils/ApiError";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 400;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    details = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        status = 409;
        code = "DUPLICATE_RESOURCE";
        message = "A record with the same unique value already exists";
        details = { fields: err.meta?.target };
        break;
      case "P2025":
        status = 404;
        code = "NOT_FOUND";
        message = "Record not found";
        break;
      case "P2003":
        status = 409;
        code = "RELATION_CONSTRAINT";
        message = "Operation violates a relation constraint";
        break;
      default:
        code = `DB_${err.code}`;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    code = "INVALID_QUERY";
    message = "Invalid data supplied";
  } else if (err instanceof TokenExpiredError) {
    status = 401;
    code = "TOKEN_EXPIRED";
    message = "Token has expired";
  } else if (err instanceof JsonWebTokenError) {
    status = 401;
    code = "TOKEN_INVALID";
    message = "Invalid token";
  } else if (err instanceof multer.MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    code = err.code;
    message = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5MB)" : err.message;
  } else if (err?.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body contains invalid JSON";
  } else if (err?.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request body too large";
  }

  const logPayload = { err, requestId: req.id, method: req.method, url: req.originalUrl, userId: req.user?.id };
  if (status >= 500) logger.error(logPayload, "Unhandled error");
  else logger.warn({ ...logPayload, err: { message: err?.message, code } }, "Request failed");

  res.status(status).json({
    success: false,
    message,
    code,
    ...(details ? { details } : {}),
    requestId: req.id,
    ...(!isProd && status >= 500 ? { stack: err?.stack } : {}),
  });
};