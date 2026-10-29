import { randomBytes, timingSafeEqual } from "crypto";
import { Prisma, type Role } from "@prisma/client";
import { env } from "../config/env";
import prisma from "../lib/prisma";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import { deleteObject, uploadImage } from "../lib/storage";
import { ApiError } from "../utils/ApiError";
import { buildFullName, splitName } from "../utils/name";
import { comparePassword, decoyCompare, hashPassword } from "../utils/password";
import { calculateProfileCompletion } from "../utils/profileCompletion";
import type { RequestMeta } from "../utils/requestContext";
import { toPublicUser } from "../utils/serializers";
import { slugify } from "../utils/slug";
import type { SignupInput } from "../validators/auth.validator";
import { audit } from "./audit.service";
import {
  sendLoginAlertEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "./email.service";
import { issueTokens, revokeAllUserTokens, revokeRefreshToken, rotateRefreshToken, sha256 } from "./token.service";

const SIGNUP_TTL_SECONDS = 30 * 60;
const RESET_TTL_MINUTES = 30;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const ROLE_LABEL: Record<Role, string> = { USER: "Normal user", OWNER: "Store owner", ADMIN: "Administrator" };

interface StoredImage {
  key: string;
  url: string;
}

interface PendingSignup {
  role: Role;
  name: string;
  email: string;
  passwordHash: string;
  storeName?: string;
  ownerImage?: StoredImage;
  storeLogo?: StoredImage;
}

export interface SignupFiles {
  ownerImage?: Express.Multer.File;
  storeLogo?: Express.Multer.File;
}

const tokenKey = (token: string) => `signup:token:${token}`;
const emailKey = (email: string) => `signup:email:${email}`;

const primaryAddressInclude = {
  addresses: { orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }], take: 1 },
};

// ───────────────────────── SIGNUP + EMAIL VERIFICATION ─────────────────────────

/** Admin accounts can only self-register with the secret ADMIN_SIGNUP_CODE. */
function assertAdminCode(code?: string) {
  if (!env.ADMIN_SIGNUP_CODE) {
    throw ApiError.forbidden("Administrator sign-up is disabled", "ADMIN_SIGNUP_DISABLED");
  }
  const given = Buffer.from(sha256(code ?? ""), "hex");
  const expected = Buffer.from(sha256(env.ADMIN_SIGNUP_CODE), "hex");
  if (!timingSafeEqual(given, expected)) {
    throw ApiError.forbidden("Invalid administrator access code", "INVALID_ADMIN_CODE");
  }
}

async function createPendingSignup(data: PendingSignup) {
  // Invalidate any earlier link for this email so only the latest one works
  const previous = await redis.get(emailKey(data.email));
  if (previous) await redis.del(tokenKey(previous));

  const token = randomBytes(32).toString("hex");
  await redis.setEx(tokenKey(token), SIGNUP_TTL_SECONDS, JSON.stringify(data));
  await redis.setEx(emailKey(data.email), SIGNUP_TTL_SECONDS, token);

  const url = `${env.BASE_URL}/api/auth/verify-email?token=${token}`;
  if (env.NODE_ENV === "development") logger.info({ url }, "Email verification link (dev only)");

  sendVerificationEmail(data.email, data.name, url);
}

/** A new signup attempt replaces an older unverified one (and cleans up its uploaded images). */
async function discardPending(email: string) {
  const token = await redis.get(emailKey(email));
  if (!token) return;
  const raw = await redis.get(tokenKey(token));
  await redis.del([tokenKey(token), emailKey(email)]);
  if (!raw) return;
  const old = JSON.parse(raw) as PendingSignup;
  await Promise.all([deleteObject(old.ownerImage?.key), deleteObject(old.storeLogo?.key)]);
}

/** Step 1: nothing is written to Postgres until the email link is clicked. */
export async function signup(input: SignupInput, files: SignupFiles = {}) {
  if (input.role === "ADMIN") assertAdminCode(input.adminCode);

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw ApiError.conflict("An account with this email already exists", "EMAIL_EXISTS");

  if (input.role === "OWNER") {
    const storeTaken = await prisma.store.findUnique({ where: { email: input.email }, select: { id: true } });
    if (storeTaken) throw ApiError.conflict("A store with this email already exists", "STORE_EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  await discardPending(input.email);

  // Owner image + store logo are uploaded now and attached when the email link is verified
  let ownerImage: StoredImage | undefined;
  let storeLogo: StoredImage | undefined;
  try {
    if (input.role === "OWNER") {
      if (files.ownerImage) ownerImage = await uploadImage({ buffer: files.ownerImage.buffer, folder: "users/signup" });
      if (files.storeLogo) storeLogo = await uploadImage({ buffer: files.storeLogo.buffer, folder: "stores/signup" });
    }
  } catch (err) {
    await deleteObject(ownerImage?.key);
    throw err;
  }

  await createPendingSignup({
    role: input.role,
    name: input.name,
    email: input.email,
    passwordHash,
    storeName: input.role === "OWNER" ? input.storeName : undefined,
    ownerImage,
    storeLogo,
  });
}

export async function resendVerification(email: string) {
  // Always silent to the caller so this can't be used to probe for pending signups
  const token = await redis.get(emailKey(email));
  if (!token) return;
  const raw = await redis.get(tokenKey(token));
  if (!raw) return;
  await createPendingSignup(JSON.parse(raw) as PendingSignup);
}

/** Step 2: link clicked -> credentials (and the store, for owners) are persisted. */
export async function verifyEmail(token: string) {
  const raw = await redis.get(tokenKey(token));
  if (!raw) {
    throw ApiError.badRequest("Verification link is invalid or has expired", "VERIFICATION_LINK_INVALID");
  }

  const data = JSON.parse(raw) as PendingSignup;
  await redis.del([tokenKey(token), emailKey(data.email)]);

  const names = splitName(data.name);

  try {
    const user = await prisma.user.create({
      data: {
        ...names,
        fullName: buildFullName(names),
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: "LOCAL",
        profilePictureKey: data.ownerImage?.key,
        profilePictureUrl: data.ownerImage?.url,
        ...(data.role === "OWNER" && data.storeName
          ? {
              ownedStores: {
                create: {
                  name: data.storeName,
                  slug: slugify(data.storeName),
                  email: data.email,
                  logoKey: data.storeLogo?.key,
                  logoUrl: data.storeLogo?.url,
                },
              },
            }
          : {}),
      },
    });

    audit({ action: "USER_REGISTERED", actorId: user.id, entityType: "User", entityId: user.id, metadata: { role: data.role } });
    sendWelcomeEmail(user.email, user.fullName);
    return user;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw ApiError.conflict("This account has already been verified", "ALREADY_VERIFIED");
    }
    throw err;
  }
}

// ───────────────────────── SESSIONS ─────────────────────────

/** Shared by password login and Google login. */
export async function startSession(userId: string, meta: RequestMeta, method: "password" | "google") {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    include: primaryAddressInclude,
  });

  const tokens = await issueTokens(user, meta);

  sendLoginAlertEmail(user.email, user.fullName, meta, method);
  audit({ action: "USER_LOGIN", actorId: user.id, entityType: "User", entityId: user.id, ip: meta.ip, metadata: { method } });

  return {
    user: toPublicUser(user),
    profileCompletion: calculateProfileCompletion(user, user.addresses[0]),
    ...tokens,
  };
}

export async function login(email: string, password: string, meta: RequestMeta, role?: Role) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  if (!user || !user.passwordHash) {
    await decoyCompare(password); // constant-time response whether or not the account exists
    throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ApiError(
      429,
      "Account temporarily locked due to repeated failed logins. Try again later.",
      "ACCOUNT_LOCKED",
    );
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginCount + 1;
    const lock = attempts >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw ApiError.forbidden(
      user.status === "SUSPENDED" ? "Account suspended. Please contact support." : "Account is not active.",
      "ACCOUNT_INACTIVE",
    );
  }

  // Only checked after the password is correct, so this never reveals which emails exist
  if (role && user.role !== role) {
    throw new ApiError(
      403,
      `This account is registered as ${ROLE_LABEL[user.role]}. Select “${ROLE_LABEL[user.role]}” and try again.`,
      "ROLE_MISMATCH",
    );
  }

  return startSession(user.id, meta, "password");
}

export async function refresh(rawToken: string, meta: RequestMeta) {
  const { user, ...tokens } = await rotateRefreshToken(rawToken, meta);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(rawToken: string | undefined, userId?: string, ip?: string) {
  if (rawToken) await revokeRefreshToken(rawToken);
  if (userId) audit({ action: "USER_LOGOUT", actorId: userId, entityType: "User", entityId: userId, ip });
}

export async function logoutAll(userId: string, ip?: string) {
  await revokeAllUserTokens(userId);
  audit({ action: "USER_LOGOUT_ALL", actorId: userId, entityType: "User", entityId: userId, ip });
}

// ───────────────────────── PASSWORDS ─────────────────────────

export async function changePassword(
  userId: string,
  currentPassword: string | undefined,
  newPassword: string,
  meta: RequestMeta,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw ApiError.notFound("User not found");

  // Google-only accounts have no password yet, so they may set one without a "current" value
  if (user.passwordHash) {
    if (!currentPassword) throw ApiError.badRequest("Current password is required", "CURRENT_PASSWORD_REQUIRED");
    if (!(await comparePassword(currentPassword, user.passwordHash))) {
      throw ApiError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
  });

  await revokeAllUserTokens(userId); // sign out every other device
  const tokens = await issueTokens(user, meta);

  sendPasswordChangedEmail(user.email, user.fullName, meta);
  audit({ action: "PASSWORD_CHANGED", actorId: userId, entityType: "User", entityId: userId, ip: meta.ip });

  return tokens;
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null, status: "ACTIVE" } });
  if (!user) return; // silent: never reveal whether the email is registered

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const raw = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
    },
  });

  const url = `${env.FRONTEND_URL ?? env.BASE_URL}/reset-password?token=${raw}`;
  if (env.NODE_ENV === "development") logger.info({ url }, "Password reset link (dev only)");
  sendPasswordResetEmail(user.email, user.fullName, url);
}

export async function resetPassword(rawToken: string, newPassword: string, meta: RequestMeta) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || record.user.deletedAt) {
    throw ApiError.badRequest("Reset link is invalid or has expired", "RESET_TOKEN_INVALID");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await revokeAllUserTokens(record.userId);
  sendPasswordChangedEmail(record.user.email, record.user.fullName, meta);
  audit({ action: "PASSWORD_RESET", actorId: record.userId, entityType: "User", entityId: record.userId, ip: meta.ip });
}

// ───────────────────────── GOOGLE ─────────────────────────

export interface GoogleProfileData {
  googleId: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  photo?: string;
}

function assertUsable(user: { status: string; deletedAt: Date | null }) {
  if (user.deletedAt) throw ApiError.forbidden("Account is not active", "ACCOUNT_INACTIVE");
  if (user.status === "SUSPENDED") throw ApiError.forbidden("Account suspended. Please contact support.", "ACCOUNT_SUSPENDED");
  if (user.status !== "ACTIVE") throw ApiError.forbidden("Account is not active", "ACCOUNT_INACTIVE");
}

async function linkGoogle(userId: string, current: string | null, googleId: string) {
  if (current !== googleId) await prisma.user.update({ where: { id: userId }, data: { providerId: googleId } });
}

/** Login never creates an account. */
export async function googleLogin(profile: GoogleProfileData) {
  if (!profile.email) throw ApiError.badRequest("Google did not share an email address", "NO_EMAIL");

  const user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    throw ApiError.notFound(`No account exists for ${profile.email}. Please sign up first.`, "ACCOUNT_NOT_FOUND");
  }
  assertUsable(user);

  if (!user.emailVerified) {
    if (!profile.emailVerified) throw ApiError.forbidden("Please verify your email address first", "EMAIL_NOT_VERIFIED");
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
  }

  await linkGoogle(user.id, user.providerId, profile.googleId);
  return { user, isNew: false };
}

/** Google signup creates normal USER accounts only (store owners and admins sign up with email). */
export async function googleSignup(profile: GoogleProfileData) {
  if (!profile.email) throw ApiError.badRequest("Google did not share an email address", "NO_EMAIL");

  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existing) {
    assertUsable(existing);
    if (profile.emailVerified) await linkGoogle(existing.id, existing.providerId, profile.googleId);
    return { user: existing, isNew: false };
  }

  const fallback = profile.email.split("@")[0];
  const firstName = profile.givenName?.trim() || profile.displayName?.trim() || fallback;
  const lastName = profile.familyName?.trim() || undefined;

  // The 20–60 char rule is enforced when the user edits their name in the profile,
  // since Google display names are often shorter.
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      fullName: buildFullName({ firstName, lastName }),
      email: profile.email,
      passwordHash: null,
      role: "USER",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      authProvider: "GOOGLE",
      providerId: profile.googleId,
      profilePictureUrl: profile.photo,
    },
  });

  audit({ action: "USER_REGISTERED", actorId: user.id, entityType: "User", entityId: user.id, metadata: { via: "google" } });
  sendWelcomeEmail(user.email, user.fullName);
  return { user, isNew: true };
}