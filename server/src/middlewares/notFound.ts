import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError";

export const notFound: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`, "ROUTE_NOT_FOUND"));
};