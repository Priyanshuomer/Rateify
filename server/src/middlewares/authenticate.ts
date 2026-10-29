import prisma from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAccessToken } from "../utils/jwt";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized("Authentication required", "TOKEN_MISSING");

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token", "TOKEN_INVALID");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, email: true, role: true, fullName: true, status: true },
  });

  if (!user) throw ApiError.unauthorized("Account no longer exists", "TOKEN_INVALID");
  if (user.status !== "ACTIVE") throw ApiError.forbidden("Account is not active", "ACCOUNT_INACTIVE");

  req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
  next();
});