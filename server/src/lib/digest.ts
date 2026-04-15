import { prisma } from "./prisma";
import { sendDailyDigest } from "./resend";

const FOLLOWUP_DAYS = 3;

async function runDailyDigest() {
  console.log("[digest] Running daily digest...");
  try {
    const agents = await prisma.user.findMany({
      where: { dailyDigestEnabled: true },
      select: { id: true, email: true, name: true },
    });

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const staleThreshold = new Date(now.getTime() - FOLLOWUP_DAYS * 24 * 60 * 60 * 1000);

    for (const agent of agents) {
      try {
        const [urgentLeads, todayVisits, topLeads] = await Promise.all([
          // Leads without activity for 3+ days (active stages only)
          prisma.lead.findMany({
            where: {
              agentId: agent.id,
              updatedAt: { lt: staleThreshold },
              stage: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] },
            },
            orderBy: { aiScore: { sort: "desc", nulls: "last" } },
            take: 5,
            select: { name: true, updatedAt: true, aiScore: true },
          }),
          // Today's visits
          prisma.visit.findMany({
            where: {
              agentId: agent.id,
              scheduledAt: { gte: todayStart, lte: todayEnd },
              status: "PENDIENTE",
            },
            orderBy: { scheduledAt: "asc" },
            include: {
              lead: { select: { name: true } },
              property: { select: { title: true } },
            },
          }),
          // Top scored leads
          prisma.lead.findMany({
            where: {
              agentId: agent.id,
              aiScore: { not: null },
              stage: { notIn: ["CERRADO_GANADO", "CERRADO_PERDIDO"] },
            },
            orderBy: { aiScore: "desc" },
            take: 3,
            select: { name: true, aiScore: true },
          }),
        ]);

        const msPerDay = 24 * 60 * 60 * 1000;

        await sendDailyDigest(agent.email, agent.name, {
          urgentLeads: urgentLeads.map((l) => ({
            name: l.name,
            daysSince: Math.floor((now.getTime() - l.updatedAt.getTime()) / msPerDay),
            score: l.aiScore,
          })),
          todayVisits: todayVisits.map((v) => ({
            clientName: v.lead.name,
            propertyTitle: v.property.title,
            time: v.scheduledAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          })),
          topLeads: topLeads.map((l) => ({ name: l.name, score: l.aiScore! })),
        });

        console.log(`[digest] Sent to ${agent.email}`);
      } catch (err) {
        console.error(`[digest] Failed for ${agent.email}:`, err);
      }
    }
  } catch (err) {
    console.error("[digest] Error fetching agents:", err);
  }
}

/**
 * Schedules the daily digest to run at 8:00 AM Argentina time (UTC-3 = 11:00 UTC).
 * Call once on server startup.
 */
export function startDigestCron() {
  if (!process.env.RESEND_API_KEY) {
    console.log("[digest] Resend not configured — digest cron skipped");
    return;
  }

  const now = new Date();
  // Target: 11:00 UTC (8:00 AM Argentina)
  const target = new Date(now);
  target.setUTCHours(11, 0, 0, 0);
  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  const msUntilFirst = target.getTime() - now.getTime();
  const hUntilFirst = (msUntilFirst / 1000 / 60 / 60).toFixed(1);
  console.log(`[digest] Cron scheduled — first run in ${hUntilFirst}h`);

  setTimeout(() => {
    runDailyDigest();
    setInterval(runDailyDigest, 24 * 60 * 60 * 1000);
  }, msUntilFirst);
}
