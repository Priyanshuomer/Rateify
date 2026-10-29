import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signAccessToken(user: { id: string; email: string; role: Role }) {
  return jwt.sign({ role: user.role, email: user.email }, env.JWT_SECRET, {
    subject: user.id,
    issuer: env.APP_NAME,
    expiresIn: env.JWT_ACCESS_TTL as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, { issuer: env.APP_NAME }) as AccessTokenPayload;
}