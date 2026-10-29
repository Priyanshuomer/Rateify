import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.string().url().default("http://localhost:3000"),
  FRONTEND_URL: optional,
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  APP_NAME: z.string().default("StoreRate"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,

  CORS_ORIGINS: z.string().default(""),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  EMAIL_USER: optional,
  EMAIL_PASS: optional,
  EMAIL_FROM: optional,

  R2_ACCOUNT_ID: optional,
  R2_ACCESS_KEY_ID: optional,
  R2_SECRET_ACCESS_KEY: optional,
  R2_BUCKET_NAME: optional,
  R2_PUBLIC_URL: optional,

  ADMIN_SIGNUP_CODE: optional,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);