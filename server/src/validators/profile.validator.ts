import { AddressType, Gender } from "@prisma/client";
import { z } from "zod";
import { nameSchema, phoneSchema } from "./common";

const part = z.string().trim().min(1).max(40);

export const updateProfileBody = z
  .object({
    name: nameSchema.optional(),
    firstName: part.optional(),
    middleName: part.nullable().optional(),
    lastName: part.optional(),
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

const text = (max: number) => z.string().trim().max(max);

export const createAddressBody = z.object({
  type: z.nativeEnum(AddressType).optional(),
  flatNo: text(50).optional(),
  street: text(150).min(1, "Street is required"),
  landmark: text(150).optional(),
  village: text(100).optional(), // area / locality
  city: text(100).min(1, "City is required"),
  state: text(100).min(1, "State is required"),
  country: text(100).optional(),
  pinCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/, "Enter a valid PIN / postal code"),
  isPrimary: z.boolean().optional(),
});

// Partial update: send only what changed. An empty string clears an optional field.
export const updateAddressBody = createAddressBody
  .omit({ isPrimary: true })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

export type UpdateProfileInput = z.infer<typeof updateProfileBody>;
export type CreateAddressInput = z.infer<typeof createAddressBody>;
export type UpdateAddressInput = z.infer<typeof updateAddressBody>;