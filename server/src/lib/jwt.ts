import jwt, { SignOptions } from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";

interface TokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Signs a short-lived access token (15m by default).
 */
export function signAccessToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  const options: SignOptions = { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"] };
  return jwt.sign({ userId }, secret, options);
}

/**
 * Signs a long-lived refresh token (7d by default).
 */
export function signRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not configured");
  const options: SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"] };
  return jwt.sign({ userId }, secret, options);
}

/**
 * Verifies an access token and returns its payload.
 * Throws AppError(401) if invalid or expired.
 */
export function verifyAccessToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new AppError(401, "Token inválido o expirado");
  }
}

/**
 * Verifies a refresh token and returns its payload.
 * Throws AppError(401) if invalid or expired.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET not configured");
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new AppError(401, "Refresh token inválido o expirado");
  }
}
