import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure the ZodError propagates to the global error handler → 400 response.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body);
    next();
  };
}

/**
 * Returns an Express middleware that validates req.query against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.query = schema.parse(req.query) as typeof req.query;
    next();
  };
}

/**
 * Returns an Express middleware that validates req.params against a Zod schema.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };
}
