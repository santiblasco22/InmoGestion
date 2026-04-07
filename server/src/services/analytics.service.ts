import { prisma } from "../lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

/**
 * Returns the main KPI summary for the agent's dashboard.
 * Computes active listings, leads this month, visits this month,
 * conversion rate, and an estimated revenue figure.
 */
export async function getSummary(agentId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    activeListings,
    leadsThisMonth,
    visitsThisMonth,
    closedWon,
    closedTotal,
    soldProperties,
  ] = await Promise.all([
    prisma.property.count({
      where: { agentId, status: { in: ["DISPONIBLE", "RESERVADO"] } },
    }),
    prisma.lead.count({
      where: { agentId, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.visit.count({
      where: { agentId, scheduledAt: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.lead.count({ where: { agentId, stage: "CERRADO_GANADO" } }),
    prisma.lead.count({
      where: { agentId, stage: { in: ["CERRADO_GANADO", "CERRADO_PERDIDO"] } },
    }),
    prisma.property.findMany({
      where: { agentId, status: "VENDIDO" },
      select: { price: true, currency: true },
    }),
  ]);

  const conversionRate =
    closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0;

  // Simple revenue estimate: sum of sold property prices at 3% commission
  const revenueEstimateARS = soldProperties
    .filter((p) => p.currency === "ARS")
    .reduce((sum, p) => sum + Number(p.price) * 0.03, 0);

  return {
    activeListings,
    leadsThisMonth,
    visitsThisMonth,
    conversionRate,
    closedWon,
    revenueEstimateARS: Math.round(revenueEstimateARS),
  };
}

/**
 * Returns monthly lead counts for the last N months.
 * @param months - Number of months to look back (default 6)
 */
export async function getLeadsOverTime(agentId: string, months = 6) {
  const result: { month: string; leads: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const count = await prisma.lead.count({
      where: { agentId, createdAt: { gte: start, lte: end } },
    });

    result.push({
      month: format(date, "MMM", { locale: undefined }),
      leads: count,
    });
  }

  return result;
}

/**
 * Returns visit count grouped by property (top 10 most-visited).
 */
export async function getVisitsPerProperty(agentId: string) {
  const grouped = await prisma.visit.groupBy({
    by: ["propertyId"],
    where: { agentId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const propertyIds = grouped.map((g) => g.propertyId);
  const properties = await prisma.property.findMany({
    where: { id: { in: propertyIds } },
    select: { id: true, title: true, neighborhood: true },
  });

  const propertyMap = Object.fromEntries(properties.map((p) => [p.id, p]));

  return grouped.map((g) => ({
    propertyId: g.propertyId,
    title: propertyMap[g.propertyId]?.title ?? "Desconocida",
    neighborhood: propertyMap[g.propertyId]?.neighborhood ?? "",
    visits: g._count.id,
  }));
}

/**
 * Returns a unified activity feed across all of the agent's leads.
 * Includes stage changes, visit schedules, new leads, and price changes.
 */
export async function getActivityFeed(agentId: string, limit = 60) {
  const [activityNotes, recentLeads, recentVisits] = await Promise.all([
    prisma.note.findMany({
      where: {
        authorId: agentId,
        OR: [
          { content: { startsWith: "[ACTIVIDAD]" } },
          { content: { startsWith: "[PRECIO]" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lead: { select: { id: true, name: true, stage: true } },
        property: { select: { id: true, title: true } },
      },
    }),
    prisma.lead.findMany({
      where: { agentId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, source: true, stage: true, createdAt: true },
    }),
    prisma.visit.findMany({
      where: { agentId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        lead: { select: { id: true, name: true } },
        property: { select: { id: true, title: true } },
      },
    }),
  ]);

  const items: {
    id: string;
    type: "stage" | "visit_scheduled" | "new_lead" | "price_change";
    content: string;
    leadId: string | null;
    leadName: string | null;
    propertyId: string | null;
    propertyTitle: string | null;
    createdAt: Date;
  }[] = [];

  for (const note of activityNotes) {
    const isPrice = note.content.startsWith("[PRECIO]");
    const content = note.content.replace(/^\[(ACTIVIDAD|PRECIO)\] /, "");
    items.push({
      id: note.id,
      type: isPrice ? "price_change" : content.toLowerCase().includes("visita") ? "visit_scheduled" : "stage",
      content,
      leadId: note.leadId ?? null,
      leadName: note.lead?.name ?? null,
      propertyId: note.propertyId ?? null,
      propertyTitle: note.property?.title ?? null,
      createdAt: note.createdAt,
    });
  }

  for (const lead of recentLeads) {
    const SOURCE_LABELS: Record<string, string> = {
      WHATSAPP: "WhatsApp", WEB: "Web", REFERIDO: "Referido", PORTAL: "Portal", OTRO: "Otro",
    };
    items.push({
      id: `lead-${lead.id}`,
      type: "new_lead",
      content: `Nuevo lead de ${SOURCE_LABELS[lead.source] ?? lead.source}`,
      leadId: lead.id,
      leadName: lead.name,
      propertyId: null,
      propertyTitle: null,
      createdAt: lead.createdAt,
    });
  }

  for (const visit of recentVisits) {
    const dt = new Date(visit.scheduledAt);
    const dateStr = dt.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
    items.push({
      id: `visit-sched-${visit.id}`,
      type: "visit_scheduled",
      content: `Visita agendada para el ${dateStr} — ${visit.property?.title ?? "Propiedad"}`,
      leadId: visit.leadId,
      leadName: visit.lead?.name ?? null,
      propertyId: visit.propertyId,
      propertyTitle: visit.property?.title ?? null,
      createdAt: visit.createdAt,
    });
  }

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}

/**
 * Returns lead counts at each pipeline stage for the funnel chart.
 */
export async function getPipelineFunnel(agentId: string) {
  const stages = [
    "NUEVO",
    "CONTACTADO",
    "VISITA_AGENDADA",
    "OFERTA_REALIZADA",
    "CERRADO_GANADO",
    "CERRADO_PERDIDO",
  ] as const;

  const counts = await Promise.all(
    stages.map((stage) =>
      prisma.lead.count({ where: { agentId, stage } }).then((count) => ({ stage, count }))
    )
  );

  return counts;
}
