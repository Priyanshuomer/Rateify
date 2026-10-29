import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { deleteObject, uploadImage } from "../lib/storage";
import { ApiError } from "../utils/ApiError";
import { buildFullAddress, toAddressParts } from "../utils/address";
import { buildFullName, splitName } from "../utils/name";
import { buildMeta, skipTake } from "../utils/pagination";
import { hashPassword } from "../utils/password";
import { slugify } from "../utils/slug";
import type { CreateStoreInput, ListStoresQuery, StoreAddressInput, UpdateStoreInput } from "../validators/store.validator";
import { audit } from "./audit.service";
import { sendStoreOwnerAccountEmail } from "./email.service";

type Scope = "admin" | "public";

const addressOrder = [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }];

const addressSelect = {
  id: true,
  type: true,
  fullAddress: true,
  flatNo: true,
  street: true,
  landmark: true,
  village: true,
  city: true,
  state: true,
  country: true,
  pinCode: true,
  isPrimary: true,
} satisfies Prisma.AddressSelect;

const storeSelect = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  description: true,
  category: true,
  status: true,
  logoUrl: true,
  bannerUrl: true,
  averageRating: true,
  ratingCount: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      fullName: true,
      email: true,
      // Fallback shown on the store when it has no address of its own.
      // Only addresses the owner marked as type "Store" are ever shown publicly.
      addresses: {
        where: { type: "STORE" },
        orderBy: addressOrder,
        take: 1,
        select: { fullAddress: true, city: true },
      },
    },
  },
  addresses: { orderBy: addressOrder, take: 1, select: addressSelect },
} satisfies Prisma.StoreSelect;

type StoreRow = Prisma.StoreGetPayload<{ select: typeof storeSelect }>;

interface MyRating {
  id: string;
  value: number;
  comment: string | null;
}

function shape(s: StoreRow, scope: Scope, mine?: MyRating | null) {
  const addr = s.addresses[0] ?? s.owner.addresses[0];
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    address: addr?.fullAddress ?? null,
    city: addr?.city ?? null,
    category: s.category,
    description: s.description,
    logoUrl: s.logoUrl,
    bannerUrl: s.bannerUrl,
    rating: Number(s.averageRating), // overall rating
    ratingCount: s.ratingCount,
    createdAt: s.createdAt,
    ...(scope === "admin"
      ? {
          email: s.email,
          phone: s.phone,
          status: s.status,
          owner: { id: s.owner.id, fullName: s.owner.fullName, email: s.owner.email },
          // the store's OWN address, split into fields (used to prefill the admin edit form)
          addressDetails: s.addresses[0] ?? null,
        }
      : { myRating: mine ?? null }), // the logged-in user's own rating (null = not rated yet)
  };
}

async function myRatingsFor(userId: string | undefined, storeIds: string[]) {
  const map = new Map<string, MyRating>();
  if (!userId || storeIds.length === 0) return map;
  const rows = await prisma.rating.findMany({
    where: { userId, storeId: { in: storeIds } },
    select: { id: true, storeId: true, value: true, comment: true },
  });
  rows.forEach((r) => map.set(r.storeId, { id: r.id, value: r.value, comment: r.comment }));
  return map;
}

/** Matches the store's own address OR the owner's "Store" address (the fallback shown on the listing). */
const addressContains = (text: string): Prisma.StoreWhereInput => ({
  OR: [
    { addresses: { some: { fullAddress: { contains: text, mode: "insensitive" } } } },
    { owner: { addresses: { some: { type: "STORE", fullAddress: { contains: text, mode: "insensitive" } } } } },
  ],
});

const SORT_FIELDS = {
  name: "name",
  email: "email",
  rating: "averageRating",
  ratingCount: "ratingCount",
  createdAt: "createdAt",
} as const;

export async function listStores(q: ListStoresQuery, opts: { scope: Scope; viewerId?: string }) {
  const admin = opts.scope === "admin";
  const and: Prisma.StoreWhereInput[] = [];

  if (q.name) and.push({ name: { contains: q.name, mode: "insensitive" } });
  if (q.address) and.push(addressContains(q.address));
  if (q.search) and.push({ OR: [{ name: { contains: q.search, mode: "insensitive" } }, addressContains(q.search)] });
  if (q.minRating !== undefined) and.push({ averageRating: { gte: q.minRating } });
  if (admin && q.email) and.push({ email: { contains: q.email, mode: "insensitive" } });

  const where: Prisma.StoreWhereInput = {
    deletedAt: null,
    status: admin ? q.status : "ACTIVE", // public users only ever see active stores
    ...(and.length ? { AND: and } : {}),
  };

  // Sorting by address isn't supported (one-to-many relation); name/email/rating/date are.
  const orderBy = [{ [SORT_FIELDS[q.sortBy]]: q.order } as Prisma.StoreOrderByWithRelationInput, { id: "asc" as const }];

  const [total, rows] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({ where, select: storeSelect, orderBy, ...skipTake(q.page, q.limit) }),
  ]);

  const mine = admin ? new Map<string, MyRating>() : await myRatingsFor(opts.viewerId, rows.map((r) => r.id));

  return {
    items: rows.map((r) => shape(r, opts.scope, mine.get(r.id))),
    meta: buildMeta(total, q.page, q.limit),
  };
}

export async function getStoreById(id: string, opts: { scope: Scope; viewerId?: string }) {
  const store = await prisma.store.findFirst({
    where: { id, deletedAt: null, ...(opts.scope === "public" ? { status: "ACTIVE" } : {}) },
    select: storeSelect,
  });
  if (!store) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");

  const mine = opts.scope === "admin" ? new Map<string, MyRating>() : await myRatingsFor(opts.viewerId, [id]);
  return shape(store, opts.scope, mine.get(id));
}

/** Admin "Add store": creates the store-owner account and the store in one step. */
export async function createStore(input: CreateStoreInput, actorId: string, ip?: string) {
  const [userTaken, storeTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.store.findUnique({ where: { email: input.email }, select: { id: true } }),
  ]);
  if (userTaken) throw ApiError.conflict("An account with this email already exists", "EMAIL_EXISTS");
  if (storeTaken) throw ApiError.conflict("A store with this email already exists", "STORE_EMAIL_EXISTS");

  const names = splitName(input.ownerName);
  const owner = await prisma.user.create({
    data: {
      ...names,
      fullName: buildFullName(names),
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: "OWNER",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      authProvider: "LOCAL",
      ownedStores: { create: { name: input.storeName, slug: slugify(input.storeName), email: input.email } },
    },
    select: { id: true, fullName: true, email: true, ownedStores: { select: storeSelect } },
  });

  const store = owner.ownedStores[0];
  sendStoreOwnerAccountEmail(owner.email, owner.fullName, store.name);
  audit({ action: "STORE_CREATED", actorId, entityType: "Store", entityId: store.id, ip, metadata: { ownerId: owner.id } });
  return shape(store, "admin");
}

export async function updateStore(id: string, input: UpdateStoreInput, actorId: string, ip?: string) {
  const existing = await prisma.store.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");

  if (input.ownerId && input.ownerId !== existing.ownerId) {
    const owner = await prisma.user.findFirst({ where: { id: input.ownerId, deletedAt: null, status: "ACTIVE" } });
    if (!owner || owner.role !== "OWNER") throw ApiError.badRequest("New owner must be an active OWNER user", "NOT_AN_OWNER");
  }

  await prisma.store.update({ where: { id }, data: input });

  audit({ action: "STORE_UPDATED", actorId, entityType: "Store", entityId: id, ip });
  return getStoreById(id, { scope: "admin" });
}

/** Admin: sets the store's own address (flat no., street, landmark, area, city, state, PIN, country). */
export async function saveStoreAddress(id: string, input: StoreAddressInput, actorId: string, ip?: string) {
  const store = await prisma.store.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  if (!store) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");

  const parts = toAddressParts(input);
  const fullAddress = buildFullAddress(parts);

  const primary = await prisma.address.findFirst({ where: { storeId: id, isPrimary: true }, select: { id: true } });
  if (primary) {
    await prisma.address.update({ where: { id: primary.id }, data: { ...parts, fullAddress, type: "STORE" } });
  } else {
    await prisma.address.create({
      data: { ...parts, fullAddress, type: "STORE", entityType: "OWNER", isPrimary: true, storeId: id },
    });
  }

  audit({ action: "STORE_ADDRESS_UPDATED", actorId, entityType: "Store", entityId: id, ip });
  return getStoreById(id, { scope: "admin" });
}

export async function deleteStore(id: string, actorId: string, ip?: string) {
  const store = await prisma.store.findFirst({ where: { id, deletedAt: null } });
  if (!store) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");

  await prisma.store.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  audit({ action: "STORE_DELETED", actorId, entityType: "Store", entityId: id, ip });
}

export async function updateStoreLogo(id: string, file: Express.Multer.File | undefined, actorId: string) {
  if (!file) throw ApiError.badRequest('Image file is required (multipart field name: "image")', "FILE_REQUIRED");

  const store = await prisma.store.findFirst({ where: { id, deletedAt: null }, select: { logoKey: true } });
  if (!store) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");

  const { key, url } = await uploadImage({ buffer: file.buffer, folder: `stores/${id}/logo` });
  await prisma.store.update({ where: { id }, data: { logoKey: key, logoUrl: url } });
  await deleteObject(store.logoKey);

  audit({ action: "STORE_LOGO_UPDATED", actorId, entityType: "Store", entityId: id });
  return getStoreById(id, { scope: "admin" });
}