import prisma from "../lib/prisma";

export async function getAdminDashboard() {
  const [totalUsers, totalStores, totalRatings, byRole] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.store.count({ where: { deletedAt: null } }),
    prisma.rating.count(),
    prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } }),
  ]);

  return {
    totalUsers,
    totalStores,
    totalRatings,
    usersByRole: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
  };
}