import { Worker } from "bullmq";
import { redisConnection, remindersQueue } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { sendVisitReminder } from "../lib/resend";

const REDIS_KEY_PREFIX = "reminder:sent:";
const WINDOW_START_MS = 23 * 60 * 60 * 1000; // 23 hours
const WINDOW_END_MS   = 25 * 60 * 60 * 1000; // 25 hours

/**
 * Worker that runs every hour and sends email reminders to agents
 * for visits scheduled ~24 hours from now.
 * Redis tracks which reminders have already been sent to prevent duplicates.
 */
export const remindersWorker = new Worker(
  "visit-reminders",
  async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + WINDOW_START_MS);
    const windowEnd   = new Date(now.getTime() + WINDOW_END_MS);

    const visits = await prisma.visit.findMany({
      where: {
        status: "PENDIENTE",
        scheduledAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        agent: { select: { email: true, name: true } },
        lead: { select: { name: true } },
        property: { select: { title: true } },
      },
    });

    let sent = 0;

    for (const visit of visits) {
      const redisKey = `${REDIS_KEY_PREFIX}${visit.id}`;
      const alreadySent = await redisConnection.get(redisKey);
      if (alreadySent) continue;

      try {
        await sendVisitReminder(
          visit.agent.email,
          visit.agent.name,
          visit.lead.name,
          visit.property.title,
          visit.scheduledAt,
          visit.type
        );

        // Mark as sent; expire after 48h so Redis stays clean
        await redisConnection.set(redisKey, "1", "EX", 48 * 60 * 60);
        sent++;
      } catch (err) {
        console.error(`[reminders] Failed to send reminder for visit ${visit.id}:`, err);
      }
    }

    if (visits.length > 0 || sent > 0) {
      console.log(`[reminders] Checked ${visits.length} upcoming visits, sent ${sent} reminders`);
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

remindersWorker.on("failed", (job, err) => {
  console.error(`[reminders] Job ${job?.id} failed:`, err.message);
});

export { remindersQueue };
