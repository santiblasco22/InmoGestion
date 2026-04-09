/**
 * Queue module — all Redis/BullMQ usage is lazy and optional.
 * If REDIS_URL is not set, all queue operations are no-ops.
 */

export interface PortalSyncJobData {
  propertyId: string;
  agentId: string;
  portals: string[];
}

function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

async function getRedisConnection() {
  if (!isRedisConfigured()) throw new Error("REDIS_URL not configured");
  const { default: IORedis } = await import("ioredis");
  return new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function enqueuePortalSync(data: PortalSyncJobData): Promise<string> {
  if (!isRedisConfigured()) {
    console.warn("[queue] Redis not configured — portal sync skipped");
    return "";
  }
  const { Queue } = await import("bullmq");
  const connection = await getRedisConnection();
  const queue = new Queue<PortalSyncJobData>("portal-sync", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
  const job = await queue.add("sync", data, {
    jobId: `sync-${data.propertyId}-${Date.now()}`,
  });
  await queue.close();
  await connection.quit();
  return job.id ?? "";
}

export async function scheduleReminderCron(): Promise<void> {
  if (!isRedisConfigured()) {
    console.warn("[queue] Redis not configured — reminder cron skipped");
    return;
  }
  const { Queue } = await import("bullmq");
  const connection = await getRedisConnection();
  const queue = new Queue("visit-reminders", {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    },
  });
  await queue.add("check-reminders", {}, {
    repeat: { pattern: "0 * * * *" },
    jobId: "reminder-cron",
  });
  await queue.close();
  await connection.quit();
}
