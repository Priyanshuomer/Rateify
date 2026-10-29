import { z } from "zod";

export const nameSchema = z
  .string({ required_error: "Name is required" })
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(20, "Name must be at least 20 characters")
      .max(60, "Name must be at most 60 characters"),
  );

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(254);

export const addressSchema = z
  .string({ required_error: "Address is required" })
  .trim()
  .min(1, "Address is required")
  .max(400, "Address must be at most 400 characters");

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(16, "Password must be at most 16 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, "Invalid phone number");

export const idParam = z.object({ id: z.string().trim().min(1).max(64) });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  order: z.enum(["asc", "desc"]).default("asc"),
});