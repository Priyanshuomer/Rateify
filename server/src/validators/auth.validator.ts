import { z } from "zod";
import { emailSchema, nameSchema, passwordSchema } from "./common";

const roleEnum = z.enum(["USER", "OWNER", "ADMIN"]);

// multipart forms send empty strings for blank inputs
const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const signupBody = z
  .object({
    role: z.preprocess(emptyToUndefined, roleEnum.default("USER")),
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    storeName: z.preprocess(
      emptyToUndefined,
      z.string().trim().min(3, "Store name must be at least 3 characters").max(120, "Store name must be at most 120 characters").optional(),
    ),
    adminCode: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  })
  .superRefine((v, ctx) => {
    if (v.role === "OWNER" && !v.storeName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["storeName"], message: "Store name is required for store owners" });
    }
    if (v.role === "ADMIN" && !v.adminCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["adminCode"], message: "Administrator access code is required" });
    }
  });

export const verifyEmailQuery = z.object({ token: z.string().trim().min(32).max(200) });

export const emailOnlyBody = z.object({ email: emailSchema });

export const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
  role: roleEnum.optional(),
});

export const refreshBody = z.object({ refreshToken: z.string().min(1).max(500).optional() });

export const changePasswordBody = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordSchema,
  })
  .refine((d) => !d.currentPassword || d.currentPassword !== d.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export const resetPasswordBody = z.object({
  token: z.string().trim().min(32).max(200),
  newPassword: passwordSchema,
});

export type SignupInput = z.infer<typeof signupBody>;