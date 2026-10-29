import { AccountStatus, Gender, Role } from "@prisma/client";
import { z } from "zod";
import { emailSchema, nameSchema, paginationSchema, passwordSchema, phoneSchema } from "./common";
import { createAddressBody } from "./profile.validator";

// Admin "Add user": structured address (type and primary flag are decided by the server)
export const createUserBody = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.nativeEnum(Role).default("USER"),
  address: createAddressBody.omit({ type: true, isPrimary: true }),
});

export const listUsersQuery = paginationSchema.extend({
  name: z.string().trim().max(60).optional(),
  email: z.string().trim().max(254).optional(),
  address: z.string().trim().max(400).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  sortBy: z.enum(["name", "email", "role", "createdAt"]).default("name"),
});

// Admin edit: details, role and status. Send only what changed.
export const updateUserBody = z
  .object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
    role: z.nativeEnum(Role).optional(),
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.nullable().optional(),
    dob: z.coerce
      .date()
      .refine((d) => d <= new Date() && d.getFullYear() >= 1900, "Invalid date of birth")
      .nullable()
      .optional(),
    gender: z.nativeEnum(Gender).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

export const userAddressParams = z.object({
  id: z.string().trim().min(1).max(64),
  addressId: z.string().trim().min(1).max(64),
});

export type CreateUserInput = z.infer<typeof createUserBody>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type UpdateUserInput = z.infer<typeof updateUserBody>;