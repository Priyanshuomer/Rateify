import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { buildMeta, skipTake } from "../utils/pagination";
import type { MyRatingsQuery } from "../validators/rating.validator";
import { audit } from "./audit.service";
import { sendRatingConfirmationToUser, sendRatingReceivedToStore } from "./email.service";

/** Recomputes the denormalized aggregates inside the same transaction as the rating write. */
async function recalculate(tx: Prisma.TransactionClient, storeId: string) {
  const agg = await tx.rating.aggregate({ where: { storeId }, _avg: { value: true }, _count: { value: true } });
  const average = Number((agg._avg.value ?? 0).toFixed(2));
  const count = agg._count.value;
  await tx.store.update({ where: { id: storeId }, data: { averageRating: average, ratingCount: count } });
  return { average, count };
}

async function getActiveStore(storeId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, deletedAt: null, status: "ACTIVE" },
    include: { owner: { select: { email: true, fullName: true } } },
  });
  if (!store) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");
  return store;
}

async function writeRating(
  mode: "create" | "update",
  userId: string,
  storeId: string,
  value: number,
  comment: string | undefined,
  ip?: string,
) {
  const store = await getActiveStore(storeId);

  const result = await prisma.$transaction(async (tx) => {
    // Row lock on the store so concurrent ratings can't compute stale aggregates
    await tx.$queryRaw`SELECT "id" FROM "stores" WHERE "id" = ${storeId} FOR UPDATE`;

    const existing = await tx.rating.findUnique({ where: { userId_storeId: { userId, storeId } } });

    let rating;
    if (mode === "create") {
      if (existing) {
        throw ApiError.conflict("You have already rated this store. Update your existing rating instead.", "RATING_EXISTS");
      }
      rating = await tx.rating.create({ data: { userId, storeId, value, comment } });
    } else {
      if (!existing) throw ApiError.notFound("You have not rated this store yet", "RATING_NOT_FOUND");
      rating = await tx.rating.update({ where: { id: existing.id }, data: { value, comment } });
    }

    const aggregates = await recalculate(tx, storeId);
    return { rating, ...aggregates };
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, fullName: true } });
  const isUpdate = mode === "update";

  // Emails: one to the rater, one to the store (store address + owner login email, deduplicated)
  sendRatingConfirmationToUser(user.email, user.fullName, store.name, value, isUpdate);
  sendRatingReceivedToStore(Array.from(new Set([store.email, store.owner.email])), {
    storeName: store.name,
    raterName: user.fullName,
    value,
    average: result.average,
    count: result.count,
    isUpdate,
    comment,
  });

  audit({
    action: isUpdate ? "RATING_UPDATED" : "RATING_CREATED",
    actorId: userId,
    entityType: "Rating",
    entityId: result.rating.id,
    ip,
    metadata: { storeId, value },
  });

  return {
    id: result.rating.id,
    storeId,
    value: result.rating.value,
    comment: result.rating.comment,
    createdAt: result.rating.createdAt,
    updatedAt: result.rating.updatedAt,
    store: { id: store.id, name: store.name, rating: result.average, ratingCount: result.count },
  };
}

export const submitRating = (userId: string, storeId: string, value: number, comment?: string, ip?: string) =>
  writeRating("create", userId, storeId, value, comment, ip);

export const modifyRating = (userId: string, storeId: string, value: number, comment?: string, ip?: string) =>
  writeRating("update", userId, storeId, value, comment, ip);

export async function listMyRatings(userId: string, q: MyRatingsQuery) {
  const where: Prisma.RatingWhereInput = { userId, store: { deletedAt: null } };
  const orderBy: Prisma.RatingOrderByWithRelationInput =
    q.sortBy === "rating" ? { value: q.order } : q.sortBy === "storeName" ? { store: { name: q.order } } : { updatedAt: q.order };

  const [total, rows] = await Promise.all([
    prisma.rating.count({ where }),
    prisma.rating.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      ...skipTake(q.page, q.limit),
      select: {
        id: true,
        value: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        store: { select: { id: true, name: true, logoUrl: true, averageRating: true, ratingCount: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => ({
      ...r,
      store: { ...r.store, averageRating: Number(r.store.averageRating) },
    })),
    meta: buildMeta(total, q.page, q.limit),
  };
}