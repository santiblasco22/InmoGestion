import { Request, Response } from "express";
import { z } from "zod";
import * as visitsService from "../services/visits.service";
import { asyncHandler } from "../middleware/errorHandler";

const visitBodySchema = z.object({
  leadId: z.string().cuid(),
  propertyId: z.string().cuid(),
  scheduledAt: z.string().datetime({ message: "Fecha inválida (ISO 8601)" }),
  type: z.enum(["PRESENCIAL", "VIRTUAL"]),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(["PENDIENTE", "REALIZADA", "CANCELADA"]),
});

const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  leadId: z.string().optional(),
  propertyId: z.string().optional(),
  status: z.enum(["PENDIENTE", "REALIZADA", "CANCELADA"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/** GET /api/visits */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters = listQuerySchema.parse(req.query);
  const result = await visitsService.listVisits(req.user.id, filters);
  res.json(result);
});

/** GET /api/visits/:id */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitsService.getVisit(req.params.id, req.user.id);
  res.json(visit);
});

/** POST /api/visits */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = visitBodySchema.parse(req.body);
  const visit = await visitsService.createVisit(req.user.id, input);
  res.status(201).json(visit);
});

/** PUT /api/visits/:id */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = visitBodySchema.partial().parse(req.body);
  const visit = await visitsService.updateVisit(req.params.id, req.user.id, input);
  res.json(visit);
});

/** PATCH /api/visits/:id/status */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = statusSchema.parse(req.body);
  const visit = await visitsService.updateVisitStatus(req.params.id, req.user.id, status);
  res.json(visit);
});

/** DELETE /api/visits/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await visitsService.deleteVisit(req.params.id, req.user.id);
  res.status(204).send();
});
