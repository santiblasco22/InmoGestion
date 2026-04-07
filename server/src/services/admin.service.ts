import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

/**
 * Returns all agents with their lead/property/visit counts.
 */
export async function listAgents() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      createdAt: true,
      _count: {
        select: { properties: true, leads: true, visits: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Returns all leads across all agents, with agent info.
 */
export async function listAllLeads() {
  return prisma.lead.findMany({
    include: {
      agent: { select: { id: true, name: true, email: true } },
      interestedProperties: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/**
 * Reassigns a lead to a different agent.
 */
export async function reassignLead(leadId: string, newAgentId: string) {
  const [lead, agent] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.user.findUnique({ where: { id: newAgentId } }),
  ]);
  if (!lead) throw new AppError(404, "Lead no encontrado");
  if (!agent) throw new AppError(404, "Agente no encontrado");

  return prisma.lead.update({
    where: { id: leadId },
    data: { agentId: newAgentId },
    include: { agent: { select: { id: true, name: true } } },
  });
}

/**
 * Returns platform-wide summary stats for the admin dashboard.
 */
export async function getAdminStats() {
  const [totalAgents, totalLeads, totalProperties, totalVisits, openLeads] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.property.count(),
    prisma.visit.count(),
    prisma.lead.count({ where: { stage: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] } } }),
  ]);

  return { totalAgents, totalLeads, totalProperties, totalVisits, openLeads };
}
