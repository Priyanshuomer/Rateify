import { randomUUID } from "crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("x-request-id");
  req.id = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};