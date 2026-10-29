import type { User } from "@prisma/client";

/** Never leak passwordHash, lock counters, provider ids, etc. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    emailVerified: user.emailVerified,
    phone: user.phone,
    role: user.role,
    status: user.status,
    dob: user.dob,
    gender: user.gender,
    bio: user.bio,
    profilePictureUrl: user.profilePictureUrl,
    authProvider: user.authProvider,
    // True once the account has a password (local signup, or a Google user who set one)
    hasPassword: Boolean(user.passwordHash),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}