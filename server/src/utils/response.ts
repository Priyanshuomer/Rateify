import type { Response } from "express";

export function sendSuccess<T>(res: Response, data: T, message = "OK", status = 200, meta?: object) {
  return res.status(status).json({ success: true, message, data, ...(meta ? { meta } : {}) });
}