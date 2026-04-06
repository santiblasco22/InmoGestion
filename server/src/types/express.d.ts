import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user — populated by requireAuth middleware */
      user: User;
    }
  }
}

export {};
