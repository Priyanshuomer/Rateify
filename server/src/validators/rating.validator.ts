import { z } from "zod";
import { paginationSchema } from "./common";

export const storeIdParam = z.object({ storeId: z.string().trim().min(1).max(64) });

export const ratingBody = z.object({
  value: z
    .number({ required_error: "Rating is required", invalid_type_error: "Rating must be a number" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(500).optional(),
});

export const myRatingsQuery = paginationSchema.extend({
  order: z.enum(["asc", "desc"]).default("desc"),
  sortBy: z.enum(["date", "rating", "storeName"]).default("date"),
});

export const ownerRatingsQuery = paginationSchema.extend({
  order: z.enum(["asc", "desc"]).default("desc"),
  storeId: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().max(60).optional(),
  email: z.string().trim().max(254).optional(),
  value: z.coerce.number().int().min(1).max(5).optional(),
  sortBy: z.enum(["name", "email", "rating", "date"]).default("date"),
});

export type RatingInput = z.infer<typeof ratingBody>;
export type MyRatingsQuery = z.infer<typeof myRatingsQuery>;
export type OwnerRatingsQuery = z.infer<typeof ownerRatingsQuery>;