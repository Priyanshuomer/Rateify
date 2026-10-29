import type { CorsOptions } from "cors";
import { env, isProd } from "./env";

const entries = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((o) => (o.startsWith("regex:") ? new RegExp(o.slice(6)) : o));

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Non-browser clients (curl, server-to-server) send no Origin header
    if (!origin) return callback(null, true);

    // Empty allowlist: reflect in dev, deny in prod
    if (entries.length === 0) return callback(null, !isProd);

    const allowed = entries.some((e) => (typeof e === "string" ? e === origin : e.test(origin)));
    return callback(null, allowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 600,
};