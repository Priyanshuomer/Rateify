import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { deleteObject, uploadImage } from "../lib/storage";
import { ApiError } from "../utils/ApiError";
import { buildFullAddress, toAddressParts } from "../utils/address";
import { buildFullName, splitName } from "../utils/name";
import { calculateProfileCompletion } from "../utils/profileCompletion";
import { toPublicUser } from "../utils/serializers";
import type { CreateAddressInput, UpdateAddressInput, UpdateProfileInput } from "../validators/profile.validator";
import { audit } from "./audit.service";

const ADDRESS_LIMIT = 10;
const addressOrder = [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }];

async function loadProfile(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: { addresses: { orderBy: addressOrder } },
  });
  if (!user) throw ApiError.notFound("User not found");

  const primary = user.addresses[0] ?? null;
  return {
    user: toPublicUser(user),
    address: primary, // primary address (kept for convenience)
    addresses: user.addresses, // every saved address
    profileCompletion: calculateProfileCompletion(user, primary),
  };
}

export const getProfile = loadProfile;

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const current = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!current) throw ApiError.notFound("User not found");

  const data: Prisma.UserUpdateInput = {};

  // Name handling: either a single `name`, or individual parts merged with existing values
  const touchesName =
    input.name !== undefined ||
    input.firstName !== undefined ||
    input.middleName !== undefined ||
    input.lastName !== undefined;

  if (touchesName) {
    const parts =
      input.name !== undefined
        ? splitName(input.name)
        : {
            firstName: input.firstName ?? current.firstName,
            middleName: input.middleName === undefined ? current.middleName : input.middleName,
            lastName: input.lastName ?? current.lastName,
          };

    const fullName = buildFullName(parts);
    if (fullName.length < 20 || fullName.length > 60) {
      throw ApiError.badRequest("Full name must be between 20 and 60 characters", "INVALID_NAME_LENGTH");
    }
    data.firstName = parts.firstName;
    data.middleName = parts.middleName ?? null;
    data.lastName = parts.lastName ?? null;
    data.fullName = fullName;
  }

  if (input.phone !== undefined) data.phone = input.phone;
  if (input.dob !== undefined) data.dob = input.dob;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.bio !== undefined) data.bio = input.bio;

  await prisma.user.update({ where: { id: userId }, data });
  audit({ action: "PROFILE_UPDATED", actorId: userId, entityType: "User", entityId: userId });
  return loadProfile(userId);
}

// ───────────────────────── ADDRESSES ─────────────────────────
// The *For functions work on any user (used by the admin panel too); `actorId` is who performed the change.

/** Adds an address. Each field is stored on its own AND clubbed into `fullAddress`. */
export async function addAddressFor(userId: string, input: CreateAddressInput, actorId: string = userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { role: true } });
  if (!user) throw ApiError.notFound("User not found");

  const parts = toAddressParts(input);
  const fullAddress = buildFullAddress(parts);

  await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    if (count >= ADDRESS_LIMIT) {
      throw ApiError.conflict(`A user can have up to ${ADDRESS_LIMIT} addresses`, "ADDRESS_LIMIT");
    }
    const makePrimary = count === 0 || input.isPrimary === true;
    if (makePrimary) await tx.address.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });

    await tx.address.create({
      data: {
        ...parts,
        fullAddress,
        type: input.type ?? "HOME",
        userId,
        entityType: user.role,
        isPrimary: makePrimary,
      },
    });
  });

  audit({ action: "ADDRESS_CREATED", actorId, entityType: "User", entityId: userId });
}

export async function editAddressFor(userId: string, id: string, input: UpdateAddressInput, actorId: string = userId) {
  const existing = await prisma.address.findFirst({ where: { id, userId } });
  if (!existing) throw ApiError.notFound("Address not found", "ADDRESS_NOT_FOUND");

  // undefined = keep current value; "" = clear it
  const pick = (next: string | undefined, current: string | null) => (next === undefined ? current : next.trim() || null);

  const parts = {
    flatNo: pick(input.flatNo, existing.flatNo),
    street: pick(input.street, existing.street),
    landmark: pick(input.landmark, existing.landmark),
    village: pick(input.village, existing.village),
    city: pick(input.city, existing.city),
    state: pick(input.state, existing.state),
    pinCode: pick(input.pinCode, existing.pinCode),
    country: pick(input.country, existing.country),
  };

  if (!parts.street || !parts.city || !parts.state || !parts.pinCode) {
    throw ApiError.badRequest("Street, city, state and PIN code are required", "ADDRESS_INCOMPLETE");
  }

  await prisma.address.update({
    where: { id },
    data: { ...parts, fullAddress: buildFullAddress(parts), ...(input.type ? { type: input.type } : {}) },
  });

  audit({ action: "ADDRESS_UPDATED", actorId, entityType: "User", entityId: userId });
}

export async function makeAddressPrimaryFor(userId: string, id: string, actorId: string = userId) {
  const address = await prisma.address.findFirst({ where: { id, userId }, select: { id: true } });
  if (!address) throw ApiError.notFound("Address not found", "ADDRESS_NOT_FOUND");

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } }),
    prisma.address.update({ where: { id }, data: { isPrimary: true } }),
  ]);
  audit({ action: "ADDRESS_PRIMARY_CHANGED", actorId, entityType: "User", entityId: userId });
}

export async function removeAddressFor(userId: string, id: string, actorId: string = userId) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw ApiError.notFound("Address not found", "ADDRESS_NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (address.isPrimary) {
      // promote the oldest remaining address so the user always has a primary one
      const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  });

  audit({ action: "ADDRESS_DELETED", actorId, entityType: "User", entityId: userId });
}

// Self-service versions used by /profile/addresses (return the full profile)
export async function createAddress(userId: string, input: CreateAddressInput) {
  await addAddressFor(userId, input);
  return loadProfile(userId);
}

export async function updateAddress(userId: string, id: string, input: UpdateAddressInput) {
  await editAddressFor(userId, id, input);
  return loadProfile(userId);
}

export async function setPrimaryAddress(userId: string, id: string) {
  await makeAddressPrimaryFor(userId, id);
  return loadProfile(userId);
}

export async function deleteAddress(userId: string, id: string) {
  await removeAddressFor(userId, id);
  return loadProfile(userId);
}

// ───────────────────────── PROFILE PICTURE ─────────────────────────

export async function updateProfilePicture(userId: string, file?: Express.Multer.File) {
  if (!file) throw ApiError.badRequest('Image file is required (multipart field name: "image")', "FILE_REQUIRED");

  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { profilePictureKey: true } });
  if (!user) throw ApiError.notFound("User not found");

  const { key, url } = await uploadImage({ buffer: file.buffer, folder: `users/${userId}/profile` });

  await prisma.user.update({ where: { id: userId }, data: { profilePictureKey: key, profilePictureUrl: url } });
  await deleteObject(user.profilePictureKey); // remove the previous picture

  audit({ action: "PROFILE_PICTURE_UPDATED", actorId: userId, entityType: "User", entityId: userId });
  return loadProfile(userId);
}

export async function removeProfilePicture(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { profilePictureKey: true } });
  if (!user) throw ApiError.notFound("User not found");

  await prisma.user.update({ where: { id: userId }, data: { profilePictureKey: null, profilePictureUrl: null } });
  await deleteObject(user.profilePictureKey);
  return loadProfile(userId);
}