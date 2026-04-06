import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";
import { sendWelcomeEmail } from "../lib/resend";

const SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

/**
 * Registers a new agent account.
 * Hashes the password, creates the User record, and returns auth tokens.
 */
export async function register(input: RegisterInput): Promise<{ tokens: AuthTokens; user: object }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, "El email ya está registrado", "EMAIL_TAKEN");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      phone: input.phone,
    },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, phone: true, createdAt: true },
  });

  const tokens = await generateAndStoreTokens(user.id);

  // Fire-and-forget welcome email
  sendWelcomeEmail(user.email, user.name).catch(() => {});

  return { tokens, user };
}

/**
 * Authenticates a user with email + password.
 * Returns auth tokens and sanitized user record on success.
 */
export async function login(
  email: string,
  password: string
): Promise<{ tokens: AuthTokens; user: object }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "Credenciales inválidas", "INVALID_CREDENTIALS");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError(401, "Credenciales inválidas", "INVALID_CREDENTIALS");
  }

  const tokens = await generateAndStoreTokens(user.id);

  const { password: _, ...safeUser } = user;
  return { tokens, user: safeUser };
}

/**
 * Issues a new access + refresh token pair given a valid refresh token.
 * Rotates the refresh token (old one is invalidated).
 */
export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);

  // Check the token exists in DB (ensures it hasn't been revoked)
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token inválido o expirado", "INVALID_REFRESH");
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  return generateAndStoreTokens(payload.userId);
}

/**
 * Revokes a refresh token on logout.
 */
export async function logout(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}

/**
 * Updates mutable profile fields (name, phone).
 */
export async function updateProfile(
  userId: string,
  data: { name?: string; phone?: string }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, phone: true, createdAt: true },
  });
  return user;
}

/**
 * Changes password after verifying the current one.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "Usuario no encontrado");

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw new AppError(400, "La contraseña actual es incorrecta", "WRONG_PASSWORD");

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  // Revoke all refresh tokens (force re-login everywhere)
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateAndStoreTokens(userId: string): Promise<AuthTokens> {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  // Persist refresh token (7-day expiry)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });

  // Clean up expired tokens for this user (housekeeping)
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });

  return { accessToken, refreshToken };
}
