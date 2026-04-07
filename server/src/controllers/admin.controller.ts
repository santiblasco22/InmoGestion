import { Request, Response } from "express";
import { z } from "zod";
import * as adminService from "../services/admin.service";
import { asyncHandler } from "../middleware/errorHandler";

/** GET /api/admin/agents */
export const listAgents = asyncHandler(async (_req: Request, res: Response) => {
  const agents = await adminService.listAgents();
  res.json({ agents });
});

/** GET /api/admin/leads */
export const listAllLeads = asyncHandler(async (_req: Request, res: Response) => {
  const leads = await adminService.listAllLeads();
  res.json({ leads });
});

/** GET /api/admin/stats */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getAdminStats();
  res.json(stats);
});

const reassignSchema = z.object({
  agentId: z.string().min(1, "agentId requerido"),
});

/** PUT /api/admin/leads/:id/reassign */
export const reassignLead = asyncHandler(async (req: Request, res: Response) => {
  const { agentId } = reassignSchema.parse(req.body);
  const lead = await adminService.reassignLead(req.params.id, agentId);
  res.json({ lead });
});

/** DELETE /api/admin/agents/:id */
export const deleteAgent = asyncHandler(async (req: Request, res: Response) => {
  await adminService.deleteAgent(req.params.id, req.user.id);
  res.status(204).send();
});
