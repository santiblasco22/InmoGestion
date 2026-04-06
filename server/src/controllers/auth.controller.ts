import { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service";
import { asyncHandler } from "../middleware/errorHandler";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken requerido"),
});

/** POST /api/auth/register */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json(result);
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  res.json(result);
});

/** POST /api/auth/refresh */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await authService.refresh(refreshToken);
  res.json(tokens);
});

/** POST /api/auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).send();
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const { password: _, ...user } = req.user as Record<string, unknown>;
  res.json({ user });
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

/** PUT /api/auth/profile */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user.id, data);
  res.json({ user });
});

/** PUT /api/auth/password */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({ message: "Contraseña actualizada correctamente" });
});
