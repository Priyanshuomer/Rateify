import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export default prisma;