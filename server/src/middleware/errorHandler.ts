import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/** Application-level error with HTTP status code and optional machine-readable code */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Standard API error response shape */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Global Express error handler.
 * Maps AppError, ZodError, and Prisma errors to JSON responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application error
  if (err instanceof AppError) {
    const body: ErrorResponse = { error: { message: err.message } };
    if (err.code) body.error.code = err.code;
    res.status(err.statusCode).json(body);
    return;
  }

  // Zod validation error → 400
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "body";
      details[key] = [...(details[key] ?? []), issue.message];
    }
    res.status(400).json({
      error: { message: "Datos de entrada inválidos", code: "VALIDATION_ERROR", details },
    });
    return;
  }

  // Prisma unique constraint violation → 409
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ error: { message: "El recurso ya existe", code: "CONFLICT" } });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: { message: "Recurso no encontrado", code: "NOT_FOUND" } });
      return;
    }
  }

  // Unknown error → 500
  console.error("[UnhandledError]", err);
  res.status(500).json({ error: { message: "Error interno del servidor", code: "INTERNAL_ERROR" } });
}

/** Wraps async route handlers so errors propagate to the global handler */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
