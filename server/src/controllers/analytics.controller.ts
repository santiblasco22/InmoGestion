import { Request, Response } from "express";
import { z } from "zod";
import * as analyticsService from "../services/analytics.service";
import { asyncHandler } from "../middleware/errorHandler";

/** GET /api/analytics/summary */
export const summary = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getSummary(req.user.id);
  res.json(data);
});

/** GET /api/analytics/leads-over-time?months=6 */
export const leadsOverTime = asyncHandler(async (req: Request, res: Response) => {
  const { months } = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }).parse(req.query);
  const data = await analyticsService.getLeadsOverTime(req.user.id, months);
  res.json(data);
});

/** GET /api/analytics/visits-per-property */
export const visitsPerProperty = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getVisitsPerProperty(req.user.id);
  res.json(data);
});

/** GET /api/analytics/pipeline-funnel */
export const pipelineFunnel = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getPipelineFunnel(req.user.id);
  res.json(data);
});
