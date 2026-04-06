import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { AppError, asyncHandler } from "./errorHandler";

/**
 * Middleware that enforces JWT authentication on protected routes.
 * Extracts Bearer token from Authorization header, validates it,
 * and attaches the full User record to req.user.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(401, "Token de acceso requerido", "UNAUTHORIZED");
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError(401, "Usuario no encontrado", "UNAUTHORIZED");
  }

  req.user = user;
  next();
});

/**
 * Middleware that restricts access to ADMIN-role users only.
 * Must be used after requireAuth.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "ADMIN") {
    throw new AppError(403, "Acceso denegado: se requiere rol ADMIN", "FORBIDDEN");
  }
  next();
}
