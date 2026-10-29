-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'OWNER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'STORE', 'OTHER');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "phone" TEXT,
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "providerId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "bio" TEXT,
    "profilePictureKey" TEXT,
    "profilePictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "entityType" "Role",
    "type" "AddressType" NOT NULL DEFAULT 'HOME',
    "fullAddress" TEXT,
    "flatNo" TEXT,
    "street" TEXT,
    "landmark" TEXT,
    "village" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'India',
    "pinCode" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "storeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "description" TEXT,
    "category" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoKey" TEXT,
    "logoUrl" TEXT,
    "bannerKey" TEXT,
    "bannerUrl" TEXT,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_providerId_key" ON "users"("providerId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_fullName_idx" ON "users"("fullName");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "addresses_entityType_idx" ON "addresses"("entityType");

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- CreateIndex
CREATE INDEX "addresses_storeId_idx" ON "addresses"("storeId");

-- CreateIndex
CREATE INDEX "addresses_city_idx" ON "addresses"("city");

-- CreateIndex
CREATE INDEX "addresses_pinCode_idx" ON "addresses"("pinCode");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stores_email_key" ON "stores"("email");

-- CreateIndex
CREATE INDEX "stores_ownerId_idx" ON "stores"("ownerId");

-- CreateIndex
CREATE INDEX "stores_name_idx" ON "stores"("name");

-- CreateIndex
CREATE INDEX "stores_status_idx" ON "stores"("status");

-- CreateIndex
CREATE INDEX "stores_averageRating_idx" ON "stores"("averageRating");

-- CreateIndex
CREATE INDEX "stores_createdAt_idx" ON "stores"("createdAt");

-- CreateIndex
CREATE INDEX "ratings_storeId_idx" ON "ratings"("storeId");

-- CreateIndex
CREATE INDEX "ratings_userId_idx" ON "ratings"("userId");

-- CreateIndex
CREATE INDEX "ratings_value_idx" ON "ratings"("value");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_userId_storeId_key" ON "ratings"("userId", "storeId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "ratings" ADD CONSTRAINT "ratings_value_range" CHECK ("value" BETWEEN 1 AND 5);