import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: Role;
      fullName: string;
    }
    interface Request {
      id: string;
      user?: User;
    }
  }
}

export {};