import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

/** Shared Redis connection for BullMQ — lazy, won't crash if Redis is unavailable */
export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,          // Don't connect until first command
  retryStrategy: () => null,  // Don't retry — fail silently
});

redisConnection.on("error", () => {
  // Suppress connection errors — Redis is optional
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
 */
export async function scheduleReminderCron(): Promise<void> {
  await remindersQueue.add(
    "check-reminders",
    {},
    {
      repeat: { pattern: "0 * * * *" },
      jobId: "reminder-cron",
    }
  );
}
