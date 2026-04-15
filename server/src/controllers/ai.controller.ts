import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { analyzeLead, matchProperties } from "../lib/ai";

export const analyzeLeadAI = asyncHandler(async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, agentId: req.user!.id },
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 10 },
      visits: { orderBy: { scheduledAt: "desc" }, take: 10 },
      interestedProperties: { select: { id: true, title: true, status: true } },
    },
  });

  if (!lead) {
    res.status(404).json({ error: { message: "Lead no encontrado" } });
    return;
  }

  const result = await analyzeLead({
    name: lead.name,
    budget: lead.budget?.toString() ?? null,
    budgetCurrency: lead.budgetCurrency,
    source: lead.source,
    stage: lead.stage,
    createdAt: lead.createdAt.toISOString(),
    notes: lead.notes.map(n => ({ content: n.content, createdAt: n.createdAt.toISOString() })),
    visits: lead.visits.map(v => ({ scheduledAt: v.scheduledAt.toISOString(), type: v.type, status: v.status })),
    interestedProperties: lead.interestedProperties.map(p => ({ title: p.title, status: p.status })),
    prefZones: lead.prefZones,
    prefTypes: lead.prefTypes,
    prefMinRooms: lead.prefMinRooms ?? undefined,
    prefMaxRooms: lead.prefMaxRooms ?? undefined,
    prefCondition: lead.prefCondition ?? undefined,
  });

  // Persist score and summary for dashboard
  await prisma.lead.update({
    where: { id: leadId },
    data: { aiScore: result.score, aiSummary: result.summary },
  });

  res.json(result);
});

export const aiDashboard = asyncHandler(async (req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({
    where: {
      agentId: req.user!.id,
      stage: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] },
    },
    select: {
      id: true, name: true, phone: true, email: true,
      stage: true, source: true, budget: true, budgetCurrency: true,
      aiScore: true, aiSummary: true, updatedAt: true,
      visits: { where: { status: "PENDIENTE" }, select: { scheduledAt: true }, take: 1 },
    },
    orderBy: [{ aiScore: "desc" }, { updatedAt: "desc" }],
  });

  res.json({ leads });
});

export const matchPropertiesAI = asyncHandler(async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const [lead, properties] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: leadId, agentId: req.user!.id },
      include: { notes: { take: 5 } },
    }),
    prisma.property.findMany({
      where: { agentId: req.user!.id },
      select: { id: true, title: true, price: true, currency: true, type: true, neighborhood: true, city: true, rooms: true, area: true, status: true },
    }),
  ]);

  if (!lead) {
    res.status(404).json({ error: { message: "Lead no encontrado" } });
    return;
  }

  const matches = await matchProperties(
    {
      name: lead.name,
      budget: lead.budget?.toString() ?? null,
      budgetCurrency: lead.budgetCurrency,
      notes: lead.notes.map(n => ({ content: n.content })),
    },
    properties.map(p => ({ ...p, price: p.price.toString(), area: p.area.toString() }))
  );

  // Enrich with full property data
  const propertyMap = Object.fromEntries(properties.map(p => [p.id, p]));
  const enriched = matches
    .filter(m => propertyMap[m.propertyId])
    .map(m => ({ ...m, property: propertyMap[m.propertyId] }));

  res.json(enriched);
});
