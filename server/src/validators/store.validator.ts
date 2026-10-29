import { StoreStatus } from "@prisma/client";
import { z } from "zod";
import { emailSchema, nameSchema, paginationSchema, passwordSchema, phoneSchema } from "./common";
import { createAddressBody } from "./profile.validator";

const storeName = z.string().trim().min(3, "Store name must be at least 3 characters").max(120);

// Admin "Add store": owner name, store name, email and password. Creates the owner account + store together.
export const createStoreBody = z.object({
  ownerName: nameSchema,
  storeName,
  email: emailSchema,
  password: passwordSchema,
});

// The address is edited separately with PUT /admin/stores/:id/address (structured fields)
export const updateStoreBody = z
  .object({
    name: storeName.optional(),
    email: emailSchema.optional(),
    ownerId: z.string().trim().min(1).max(64).optional(),
    phone: phoneSchema.nullable().optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    category: z.string().trim().max(60).nullable().optional(),
    status: z.nativeEnum(StoreStatus).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

export const storeAddressBody = createAddressBody.omit({ type: true, isPrimary: true });

export const listStoresQuery = paginationSchema.extend({
  search: z.string().trim().max(400).optional(), // matches name OR address
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(254).optional(), // admin only
  address: z.string().trim().max(400).optional(),
  status: z.nativeEnum(StoreStatus).optional(), // admin only
  minRating: z.coerce.number().min(0).max(5).optional(),
  sortBy: z.enum(["name", "email", "rating", "ratingCount", "createdAt"]).default("name"),
});

export type CreateStoreInput = z.infer<typeof createStoreBody>;
export type UpdateStoreInput = z.infer<typeof updateStoreBody>;
export type StoreAddressInput = z.infer<typeof storeAddressBody>;
export type ListStoresQuery = z.infer<typeof listStoresQuery>;