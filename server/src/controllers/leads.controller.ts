import { Request, Response } from "express";
import { z } from "zod";
import * as leadsService from "../services/leads.service";
import { asyncHandler } from "../middleware/errorHandler";

const leadBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  budget: z.coerce.number().positive().optional(),
  budgetCurrency: z.enum(["ARS", "USD"]).optional(),
  source: z.enum(["WHATSAPP", "WEB", "REFERIDO", "PORTAL", "OTRO"]),
  stage: z.enum(["NUEVO", "CONTACTADO", "VISITA_AGENDADA", "OFERTA_REALIZADA", "CERRADO_GANADO", "CERRADO_PERDIDO"]).optional(),
  propertyIds: z.array(z.string()).optional(),
});

const stageSchema = z.object({
  stage: z.enum(["NUEVO", "CONTACTADO", "VISITA_AGENDADA", "OFERTA_REALIZADA", "CERRADO_GANADO", "CERRADO_PERDIDO"]),
});

const noteSchema = z.object({
  content: z.string().min(1, "El contenido de la nota no puede estar vacío"),
});

const listQuerySchema = z.object({
  stage: z.enum(["NUEVO", "CONTACTADO", "VISITA_AGENDADA", "OFERTA_REALIZADA", "CERRADO_GANADO", "CERRADO_PERDIDO"]).optional(),
  source: z.enum(["WHATSAPP", "WEB", "REFERIDO", "PORTAL", "OTRO"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/** GET /api/leads */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters = listQuerySchema.parse(req.query);
  const result = await leadsService.listLeads(req.user.id, filters);
  res.json(result);
});

/** GET /api/leads/:id */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const lead = await leadsService.getLead(req.params.id, req.user.id);
  res.json(lead);
});

/** POST /api/leads */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const input = leadBodySchema.parse(req.body);
  const lead = await leadsService.createLead(req.user.id, input);
  res.status(201).json(lead);
});

/** PUT /api/leads/:id */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const input = leadBodySchema.partial().parse(req.body);
  const lead = await leadsService.updateLead(req.params.id, req.user.id, input);
  res.json(lead);
});

/** PATCH /api/leads/:id/stage */
export const updateStage = asyncHandler(async (req: Request, res: Response) => {
  const { stage } = stageSchema.parse(req.body);
  const lead = await leadsService.updateLeadStage(req.params.id, req.user.id, stage);
  res.json(lead);
});

/** DELETE /api/leads/:id */
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await leadsService.deleteLead(req.params.id, req.user.id);
  res.status(204).send();
});

/** POST /api/leads/:id/notes */
export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const { content } = noteSchema.parse(req.body);
  const note = await leadsService.addNote(req.params.id, req.user.id, content);
  res.status(201).json(note);
});

/** GET /api/leads/:id/notes */
export const getNotes = asyncHandler(async (req: Request, res: Response) => {
  const notes = await leadsService.getLeadNotes(req.params.id, req.user.id);
  res.json(notes);
});
