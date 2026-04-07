import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

/** Shared Redis connection for BullMQ */
export const redisConnection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
});

// ─── Portal Sync Queue ────────────────────────────────────────────────────────

export interface PortalSyncJobData {
  propertyId: string;
  agentId: string;
  portals: string[];
}

export const portalSyncQueue = new Queue<PortalSyncJobData>("portal-sync", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const portalSyncEvents = new QueueEvents("portal-sync", {
  connection: redisConnection,
});

/**
 * Enqueues a portal sync job for the given property.
 * @param data - Job payload with propertyId and portals to sync
 */
export async function enqueuePortalSync(data: PortalSyncJobData): Promise<string> {
  const job = await portalSyncQueue.add("sync", data, {
    jobId: `sync-${data.propertyId}-${Date.now()}`,
  });
  return job.id ?? "";
}

// ─── Visit Reminders Queue ────────────────────────────────────────────────────

export const remindersQueue = new Queue("visit-reminders", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Schedules the hourly reminder check cron job.
 * Safe to call multiple times — BullMQ deduplicates by jobId.
 */
export async function scheduleReminderCron(): Promise<void> {
  await remindersQueue.add(
    "check-reminders",
    {},
    {
      repeat: { pattern: "0 * * * *" }, // every hour
      jobId: "reminder-cron",
    }
  );
}
