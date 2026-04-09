import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../lib/prisma";
import { sendVisitReminder } from "../lib/resend";

const REDIS_URL = process.env.REDIS_URL!;
const REDIS_KEY_PREFIX = "reminder:sent:";
const WINDOW_START_MS = 23 * 60 * 60 * 1000;
const WINDOW_END_MS   = 25 * 60 * 60 * 1000;

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

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
      const alreadySent = await connection.get(redisKey);
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
        await connection.set(redisKey, "1", "EX", 48 * 60 * 60);
        sent++;
      } catch (err) {
        console.error(`[reminders] Failed to send reminder for visit ${visit.id}:`, err);
      }
    }

    if (visits.length > 0 || sent > 0) {
      console.log(`[reminders] Checked ${visits.length} visits, sent ${sent} reminders`);
    }
  },
  { connection, concurrency: 1 }
);

remindersWorker.on("failed", (job, err) => {
  console.error(`[reminders] Job ${job?.id} failed:`, err.message);
});
