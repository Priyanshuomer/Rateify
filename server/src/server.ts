import http from "http";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import prisma from "./lib/prisma";
import { connectRedis, redis } from "./lib/redis";

async function bootstrap() {
  await connectRedis();
  await prisma.$connect();

  const server = http.createServer(app).listen(env.PORT, () => {
    logger.info(`Server running on ${env.BASE_URL} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      await redis.quit().catch(() => undefined);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // force exit if connections hang
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});