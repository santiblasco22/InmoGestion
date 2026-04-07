import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../lib/resend";
import { redisConnection } from "../lib/queue";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const RESET_TOKEN_TTL = 60 * 60; // 1 hour in seconds
const RESET_KEY = (token: string) => `pwd-reset:${token}`;

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
 * Verifies a Google ID token, then finds-or-creates a user.
 * Links accounts if the email already exists via password login.
 */
export async function loginWithGoogle(credential: string): Promise<{ tokens: AuthTokens; user: object }> {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  }).catch(() => { throw new AppError(401, "Token de Google inválido", "INVALID_GOOGLE_TOKEN"); });

  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new AppError(401, "No se pudo obtener la información de Google", "INVALID_GOOGLE_PAYLOAD");
  }

  const { sub: googleId, email, name = "Usuario", picture: avatarUrl } = payload;

  // Try to find by googleId first, then by email (link existing account)
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    // Link googleId if not set yet
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: user.avatarUrl ?? avatarUrl },
      });
    }
  } else {
    // Create new user — no usable password (random hash they'll never know)
    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), SALT_ROUNDS);
    user = await prisma.user.create({
      data: { email, name, googleId, avatarUrl, password: randomPassword },
    });
    sendWelcomeEmail(email, name).catch(() => {});
  }

  const tokensResult = await generateAndStoreTokens(user.id);
  const { password: _, ...safeUser } = user;
  return { tokens: tokensResult, user: safeUser };
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

/**
 * Generates a reset token and emails it. Always returns success to avoid
 * leaking whether an email is registered.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // silent — don't leak existence

  const token = crypto.randomBytes(32).toString("hex");
  await redisConnection.set(RESET_KEY(token), user.id, "EX", RESET_TOKEN_TTL);

  sendPasswordResetEmail(user.email, user.name, token).catch(() => {});
}

/**
 * Validates a reset token and sets the new password.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const userId = await redisConnection.get(RESET_KEY(token));
  if (!userId) throw new AppError(400, "El enlace es inválido o expiró", "INVALID_RESET_TOKEN");

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  // Invalidate token and all active sessions
  await Promise.all([
    redisConnection.del(RESET_KEY(token)),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ]);
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
