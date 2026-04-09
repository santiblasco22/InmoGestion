import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const redisAvailable = !!REDIS_URL;

export interface PortalSyncJobData {
  propertyId: string;
  agentId: string;
  portals: string[];
}

// ─── Stub exports when Redis is not available ─────────────────────────────────

let _redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_redisConnection) {
    if (!REDIS_URL) throw new Error("Redis not configured");
    _redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return _redisConnection;
}

// Keep redisConnection export for backwards compat (used in reminders.worker)
export const redisConnection = new Proxy({} as IORedis, {
  get(_target, prop) {
    return getRedisConnection()[prop as keyof IORedis];
  },
});

export async function enqueuePortalSync(data: PortalSyncJobData): Promise<string> {
  if (!redisAvailable) {
    console.warn("[queue] Redis not available — portal sync skipped");
    return "";
  }
  const { Queue } = await import("bullmq");
  const queue = new Queue<PortalSyncJobData>("portal-sync", {
    connection: getRedisConnection(),
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
  return job.id ?? "";
}

export async function scheduleReminderCron(): Promise<void> {
  if (!redisAvailable) {
    console.warn("[queue] Redis not available — reminder cron skipped");
    return;
  }
  const { Queue } = await import("bullmq");
  const queue = new Queue("visit-reminders", {
    connection: getRedisConnection(),
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
}
