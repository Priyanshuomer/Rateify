import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Request } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import passport from "./config/passport";
import { logger } from "./lib/logger";
import prisma from "./lib/prisma";
import { redis } from "./lib/redis";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import { apiLimiter } from "./middlewares/rateLimiter";
import { requestId } from "./middlewares/requestId";
import routes from "./routes";
import { asyncHandler } from "./utils/asyncHandler";

const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(requestId);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as Request).id,
    autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/health/ready" },
  }),
);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

// Health checks (liveness + readiness)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.get(
  "/health/ready",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: "ready" });
  }),
);

app.use("/api", apiLimiter, routes);

// Must stay last
app.use(notFound);
app.use(errorHandler);

export default app;