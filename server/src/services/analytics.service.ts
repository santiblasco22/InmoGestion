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
