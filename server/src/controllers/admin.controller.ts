import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";

export const getAgents = asyncHandler(async (_req: Request, res: Response) => {
  const agents = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
      _count: { select: { properties: true, leads: true, visits: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json({ agents });
});

export const deleteAgent = asyncHandler(async (req: Request, res: Response) => {
  const { agentId } = req.params;

  if (agentId === req.user!.id) {
    res.status(400).json({ error: { message: "No podés eliminar tu propia cuenta" } });
    return;
  }

  // Delete in order to satisfy foreign key constraints
  await prisma.$transaction([
    prisma.note.deleteMany({ where: { authorId: agentId } }),
    prisma.refreshToken.deleteMany({ where: { userId: agentId } }),
    prisma.visit.deleteMany({ where: { agentId } }),
    prisma.lead.deleteMany({ where: { agentId } }),
    prisma.property.deleteMany({ where: { agentId } }),
    prisma.user.delete({ where: { id: agentId } }),
  ]);

  res.status(204).send();
});
