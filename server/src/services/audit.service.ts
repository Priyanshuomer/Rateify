import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";

interface AuditEntry {
  action: string;
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
}

/** Fire-and-forget; auditing must never break the request. */
export function audit(entry: AuditEntry) {
  prisma.auditLog
    .create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        ipAddress: entry.ip,
      },
    })
    .catch((err) => logger.error({ err, action: entry.action }, "Failed to write audit log"));
}