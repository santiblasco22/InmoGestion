import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";

const AUTOMATION_SELECT = {
  autoAdvanceStage: true,
  autoMatchProperties: true,
  dailyDigestEnabled: true,
  autoPortalSync: true,
} as const;

const automationSchema = z.object({
  autoAdvanceStage: z.boolean().optional(),
  autoMatchProperties: z.boolean().optional(),
  dailyDigestEnabled: z.boolean().optional(),
  autoPortalSync: z.boolean().optional(),
});

/** GET /api/settings/automation */
export const getAutomation = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: AUTOMATION_SELECT,
  });
  res.json(user);
});

/** PATCH /api/settings/automation */
export const updateAutomation = asyncHandler(async (req: Request, res: Response) => {
  const data = automationSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: AUTOMATION_SELECT,
  });
  res.json(user);
});
