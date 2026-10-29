import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { buildMeta, skipTake } from "../utils/pagination";
import type { OwnerRatingsQuery } from "../validators/rating.validator";

export async function getOwnedStores(ownerId: string) {
  const stores = await prisma.store.findMany({
    where: { ownerId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      logoUrl: true,
      averageRating: true,
      ratingCount: true,
      addresses: { where: { isPrimary: true }, take: 1, select: { fullAddress: true } },
    },
  });

  return stores.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    status: s.status,
    logoUrl: s.logoUrl,
    address: s.addresses[0]?.fullAddress ?? null,
    averageRating: Number(s.averageRating),
    ratingCount: s.ratingCount,
  }));
}

export async function getDashboard(ownerId: string) {
  const stores = await getOwnedStores(ownerId);
  const ids = stores.map((s) => s.id);

  const [distribution, recent] = ids.length
    ? await Promise.all([
        prisma.rating.groupBy({ by: ["storeId", "value"], where: { storeId: { in: ids } }, _count: { _all: true } }),
        prisma.rating.findMany({
          where: { storeId: { in: ids } },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            value: true,
            comment: true,
            updatedAt: true,
            user: { select: { id: true, fullName: true, email: true, profilePictureUrl: true } },
            store: { select: { id: true, name: true } },
          },
        }),
      ])
    : [[], []];

  const storeSummaries = stores.map((s) => {
    const breakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    distribution.filter((d) => d.storeId === s.id).forEach((d) => (breakdown[String(d.value)] = d._count._all));
    return { ...s, ratingBreakdown: breakdown };
  });

  const totalRatings = stores.reduce((sum, s) => sum + s.ratingCount, 0);
  const overall = totalRatings
    ? Number((stores.reduce((sum, s) => sum + s.averageRating * s.ratingCount, 0) / totalRatings).toFixed(2))
    : 0;

  return {
    totalStores: stores.length,
    totalRatings,
    averageRating: overall, // average rating across the owner's store(s)
    stores: storeSummaries,
    recentRatings: recent,
  };
}

/** Users who rated this owner's store(s), with filters + sorting. */
export async function listStoreRatings(ownerId: string, q: OwnerRatingsQuery) {
  if (q.storeId) {
    const owned = await prisma.store.findFirst({ where: { id: q.storeId, ownerId, deletedAt: null }, select: { id: true } });
    if (!owned) throw ApiError.notFound("Store not found", "STORE_NOT_FOUND");
  }

  const where: Prisma.RatingWhereInput = {
    store: { ownerId, deletedAt: null, ...(q.storeId ? { id: q.storeId } : {}) },
    ...(q.value ? { value: q.value } : {}),
    user: {
      ...(q.name ? { fullName: { contains: q.name, mode: "insensitive" } } : {}),
      ...(q.email ? { email: { contains: q.email, mode: "insensitive" } } : {}),
    },
  };

  const orderBy: Prisma.RatingOrderByWithRelationInput =
    q.sortBy === "name"
      ? { user: { fullName: q.order } }
      : q.sortBy === "email"
        ? { user: { email: q.order } }
        : q.sortBy === "rating"
          ? { value: q.order }
          : { updatedAt: q.order };

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
        user: { select: { id: true, fullName: true, email: true, profilePictureUrl: true } },
        store: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { items: rows, meta: buildMeta(total, q.page, q.limit) };
}