import { z } from "zod";
import { joinAddress, MAX_FULL_ADDRESS } from "./address";

export const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");

export const nameSchema = z
  .string()
  .transform(normalizeName)
  .refine((v) => v.length >= 20 && v.length <= 60, {
    message: "Name must be between 20 and 60 characters",
  });

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Enter a valid email")
  .transform((v) => v.toLowerCase());

export const addressSchema = z
  .string()
  .trim()
  .min(1, "Address is required")
  .max(400, "Address must be at most 400 characters");

/** Individual address fields: street, city, state and PIN are required */
export const addressFieldsSchema = z.object({
  flatNo: z.string().trim().max(50, "At most 50 characters"),
  street: z.string().trim().min(1, "Street is required").max(150, "At most 150 characters"),
  landmark: z.string().trim().max(150, "At most 150 characters"),
  village: z.string().trim().max(100, "At most 100 characters"),
  city: z.string().trim().min(1, "City is required").max(100, "At most 100 characters"),
  state: z.string().trim().min(1, "State is required").max(100, "At most 100 characters"),
  country: z.string().trim().max(100, "At most 100 characters"),
  pinCode: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/, "Enter a valid PIN / postal code"),
});

const totalLength = {
  path: ["street"],
  message: `The whole address is too long (max ${MAX_FULL_ADDRESS} characters)`,
};

/** Address fields + the 400-character limit on the combined address */
export const addressInputSchema = addressFieldsSchema.refine((v) => joinAddress(v).length <= MAX_FULL_ADDRESS, totalLength);
export const addressTotalRefine = (v: z.infer<typeof addressFieldsSchema>) => joinAddress(v).length <= MAX_FULL_ADDRESS;
export const addressTotalIssue = totalLength;

export const passwordRules = [
  { key: "length", label: "8–16 characters", test: (v: string) => v.length >= 8 && v.length <= 16 },
  { key: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { key: "special", label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const passwordSchema = z
  .string()
  .refine((v) => v.length >= 8 && v.length <= 16, "Password must be 8–16 characters")
  .refine((v) => /[A-Z]/.test(v), "Password needs at least one uppercase letter")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "Password needs at least one special character");

export const phoneRegex = /^\+?[0-9]{7,15}$/;

export const roleSchema = z.enum(["USER", "OWNER", "ADMIN"]);

export const storeNameSchema = z.string().trim().min(3, "At least 3 characters").max(120, "At most 120 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  role: roleSchema.optional(),
});

/** Signup asks only for role, name, email and password. Owners add a store name; admins add the access code. */
export const signupSchema = z
  .object({
    role: roleSchema,
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    storeName: z.string().optional(),
    adminCode: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "OWNER") {
      const n = (v.storeName ?? "").trim();
      if (n.length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["storeName"], message: "Store name must be at least 3 characters" });
      } else if (n.length > 120) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["storeName"], message: "Store name must be at most 120 characters" });
      }
    }
    if (v.role === "ADMIN" && !(v.adminCode ?? "").trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["adminCode"], message: "Enter the administrator access code" });
    }
  });

export const ratingSchema = z.object({
  value: z.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().max(500, "Comment must be at most 500 characters").optional(),
});

/** Admin "Add user": name, email, password, role and a structured address */
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
  address: addressInputSchema,
});

/** Admin "Add store": owner name, store name, email and password */
export const createStoreSchema = z.object({
  ownerName: nameSchema,
  storeName: storeNameSchema,
  email: emailSchema,
  password: passwordSchema,
});