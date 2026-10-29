import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { buildFullAddress, toAddressParts } from "../utils/address";
import { buildFullName, splitName } from "../utils/name";
import { buildMeta, skipTake } from "../utils/pagination";
import { hashPassword } from "../utils/password";
import { toPublicUser } from "../utils/serializers";
import type { CreateAddressInput, UpdateAddressInput } from "../validators/profile.validator";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "../validators/user.validator";
import { audit } from "./audit.service";
import { sendAccountCreatedByAdminEmail } from "./email.service";
import * as profileService from "./profile.service";
import { revokeAllUserTokens } from "./token.service";

const listSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  profilePictureUrl: true,
  createdAt: true,
  addresses: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    take: 1,
    select: { fullAddress: true, city: true, state: true, pinCode: true },
  },
  ownedStores: { where: { deletedAt: null }, select: { averageRating: true, ratingCount: true } },
} satisfies Prisma.UserSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof listSelect }>;

/** Weighted by number of ratings so a store with 100 ratings counts more than one with 1. */
function ownerRating(stores: { averageRating: Prisma.Decimal; ratingCount: number }[]) {
  const total = stores.reduce((s, st) => s + st.ratingCount, 0);
  if (total === 0) return 0;
  const sum = stores.reduce((s, st) => s + Number(st.averageRating) * st.ratingCount, 0);
  return Number((sum / total).toFixed(2));
}

function shape(u: ListRow) {
  return {
    id: u.id,
    name: u.fullName,
    email: u.email,
    address: u.addresses[0]?.fullAddress ?? null,
    role: u.role,
    status: u.status,
    phone: u.phone,
    profilePictureUrl: u.profilePictureUrl,
    rating: u.role === "OWNER" ? ownerRating(u.ownedStores) : null, // only store owners have a rating
    createdAt: u.createdAt,
  };
}

const SORT_FIELDS = { name: "fullName", email: "email", role: "role", createdAt: "createdAt" } as const;

export async function createUser(input: CreateUserInput, actorId: string, ip?: string) {
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw ApiError.conflict("An account with this email already exists", "EMAIL_EXISTS");

  const names = splitName(input.name);
  const parts = toAddressParts(input.address);
  const fullAddress = buildFullAddress(parts);
  const addressType = input.role === "OWNER" ? ("STORE" as const) : ("HOME" as const);

  const user = await prisma.user.create({
    data: {
      ...names,
      fullName: buildFullName(names),
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      authProvider: "LOCAL",
      addresses: {
        create: { ...parts, fullAddress, type: addressType, entityType: input.role, isPrimary: true },
      },
    },
    include: { addresses: true },
  });

  sendAccountCreatedByAdminEmail(user.email, user.fullName, user.role);
  audit({ action: "USER_CREATED_BY_ADMIN", actorId, entityType: "User", entityId: user.id, ip, metadata: { role: user.role } });

  return { ...toPublicUser(user), address: user.addresses[0]?.fullAddress ?? null };
}

export async function listUsers(q: ListUsersQuery) {
  const and: Prisma.UserWhereInput[] = [];
  if (q.name) and.push({ fullName: { contains: q.name, mode: "insensitive" } });
  if (q.email) and.push({ email: { contains: q.email, mode: "insensitive" } });
  if (q.role) and.push({ role: q.role });
  if (q.status) and.push({ status: q.status });
  if (q.address) {
    and.push({ addresses: { some: { fullAddress: { contains: q.address, mode: "insensitive" } } } });
  }

  const where: Prisma.UserWhereInput = { deletedAt: null, ...(and.length ? { AND: and } : {}) };
  const orderBy = [{ [SORT_FIELDS[q.sortBy]]: q.order } as Prisma.UserOrderByWithRelationInput, { id: "asc" as const }];

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: listSelect, orderBy, ...skipTake(q.page, q.limit) }),
  ]);

  return { items: rows.map(shape), meta: buildMeta(total, q.page, q.limit) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      addresses: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      ownedStores: {
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, averageRating: true, ratingCount: true, status: true },
      },
    },
  });
  if (!user) throw ApiError.notFound("User not found");

  return {
    ...toPublicUser(user),
    addresses: user.addresses,
    address: user.addresses[0]?.fullAddress ?? null,
    // Store owners get their rating shown, as required
    rating: user.role === "OWNER" ? ownerRating(user.ownedStores) : null,
    stores:
      user.role === "OWNER"
        ? user.ownedStores.map((s) => ({ ...s, averageRating: Number(s.averageRating) }))
        : undefined,
  };
}

/** Admin edit: details (name, email, phone, dob, gender, bio), role and status. Returns the refreshed user detail. */
export async function updateUser(id: string, input: UpdateUserInput, actorId: string, ip?: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw ApiError.notFound("User not found");

  // Admins may edit their own details, but not their own role or status
  if (id === actorId && (input.role !== undefined || input.status !== undefined)) {
    throw ApiError.badRequest("You cannot change your own role or status", "SELF_MODIFICATION");
  }

  if (input.role && input.role !== user.role && user.role === "OWNER") {
    const stores = await prisma.store.count({ where: { ownerId: id, deletedAt: null } });
    if (stores > 0) throw ApiError.conflict("Reassign or delete this owner's stores before changing their role", "OWNER_HAS_STORES");
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.status !== undefined) data.status = input.status;

  if (input.name !== undefined) {
    const names = splitName(input.name);
    data.firstName = names.firstName;
    data.middleName = names.middleName ?? null;
    data.lastName = names.lastName ?? null;
    data.fullName = buildFullName(names);
  }

  let emailChanged = false;
  if (input.email !== undefined && input.email !== user.email) {
    if (user.authProvider === "GOOGLE") {
      throw ApiError.badRequest("The email of a Google account can't be changed", "EMAIL_LOCKED");
    }
    const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (taken) throw ApiError.conflict("An account with this email already exists", "EMAIL_EXISTS");
    data.email = input.email;
    emailChanged = true;
  }

  if (input.phone !== undefined) data.phone = input.phone;
  if (input.dob !== undefined) data.dob = input.dob;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.bio !== undefined) data.bio = input.bio;

  await prisma.user.update({ where: { id }, data });

  // Suspending/deactivating or changing the login email signs the user out everywhere
  if ((input.status && input.status !== "ACTIVE") || emailChanged) await revokeAllUserTokens(id);

  audit({
    action: "USER_UPDATED_BY_ADMIN",
    actorId,
    entityType: "User",
    entityId: id,
    ip,
    metadata: { fields: Object.keys(input) },
  });
  return getUserById(id);
}

export async function deleteUser(id: string, actorId: string, ip?: string) {
  if (id === actorId) throw ApiError.badRequest("You cannot delete your own account", "SELF_MODIFICATION");

  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw ApiError.notFound("User not found");

  if (user.role === "OWNER") {
    const stores = await prisma.store.count({ where: { ownerId: id, deletedAt: null } });
    if (stores > 0) throw ApiError.conflict("Delete or reassign this owner's stores first", "OWNER_HAS_STORES");
  }

  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: "DELETED" } });
  await revokeAllUserTokens(id);
  audit({ action: "USER_DELETED", actorId, entityType: "User", entityId: id, ip });
}

// ───────────────────────── Admin: a user's addresses ─────────────────────────

export async function addUserAddress(userId: string, input: CreateAddressInput, actorId: string) {
  await profileService.addAddressFor(userId, input, actorId);
  return getUserById(userId);
}

export async function updateUserAddress(userId: string, addressId: string, input: UpdateAddressInput, actorId: string) {
  await profileService.editAddressFor(userId, addressId, input, actorId);
  return getUserById(userId);
}

export async function setUserPrimaryAddress(userId: string, addressId: string, actorId: string) {
  await profileService.makeAddressPrimaryFor(userId, addressId, actorId);
  return getUserById(userId);
}

export async function deleteUserAddress(userId: string, addressId: string, actorId: string) {
  await profileService.removeAddressFor(userId, addressId, actorId);
  return getUserById(userId);
}