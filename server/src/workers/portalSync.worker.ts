/**
 * Portal Sync Worker — runs as a separate process.
 * Consumes jobs from the "portal-sync" BullMQ queue and publishes
 * property listings to external real-estate portals.
 *
 * Run with: npm run worker
 */
import "dotenv/config";
import { Worker, Job } from "bullmq";
import { redisConnection, PortalSyncJobData } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { Portal } from "@prisma/client";

// ─── Portal adapters ──────────────────────────────────────────────────────────

/**
 * Generates a simplified IDX/XML payload for a property.
 * In production this would follow each portal's specific format.
 */
function buildXmlPayload(property: {
  id: string;
  title: string;
  description: string | null;
  address: string;
  neighborhood: string;
  city: string;
  price: string | number;
  currency: string;
  type: string;
  rooms: number;
  bathrooms: number;
  area: string | number;
  amenities: string[];
  photos: string[];
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<listing>
  <id>${property.id}</id>
  <title><![CDATA[${property.title}]]></title>
  <description><![CDATA[${property.description ?? ""}]]></description>
  <address><![CDATA[${property.address}, ${property.neighborhood}, ${property.city}]]></address>
  <price currency="${property.currency}">${property.price}</price>
  <type>${property.type}</type>
  <rooms>${property.rooms}</rooms>
  <bathrooms>${property.bathrooms}</bathrooms>
  <area>${property.area}</area>
  <amenities>
    ${property.amenities.map((a) => `<amenity>${a}</amenity>`).join("\n    ")}
  </amenities>
  <photos>
    ${property.photos.map((p) => `<photo>${p}</photo>`).join("\n    ")}
  </photos>
</listing>`;
}

/**
 * Simulated portal POST.
 * Replace with real HTTP calls to ZonaProp / ArgenProp APIs.
 */
async function publishToPortal(
  portal: string,
  _xml: string,
  propertyId: string
): Promise<{ externalId: string }> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

  // Simulate occasional failure
  if (Math.random() < 0.05) {
    throw new Error(`${portal} API timeout`);
  }

  return { externalId: `${portal.toLowerCase()}-${propertyId}-${Date.now()}` };
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const worker = new Worker<PortalSyncJobData>(
  "portal-sync",
  async (job: Job<PortalSyncJobData>) => {
    const { propertyId, portals } = job.data;

    console.log(`[PortalSyncWorker] Processing job ${job.id} for property ${propertyId}`);

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    const xml = buildXmlPayload({
      ...property,
      price: property.price.toString(),
      area: property.area.toString(),
    });

    const results = await Promise.allSettled(
      portals.map(async (portalStr) => {
        const portal = portalStr as Portal;
        try {
          const { externalId } = await publishToPortal(portal, xml, propertyId);

          await prisma.portalSync.upsert({
            where: { propertyId_portal: { propertyId, portal } },
            create: {
              propertyId,
              portal,
              externalId,
              lastSyncedAt: new Date(),
              status: "SUCCESS",
            },
            update: {
              externalId,
              lastSyncedAt: new Date(),
              status: "SUCCESS",
              errorMessage: null,
            },
          });

          console.log(`[PortalSyncWorker] ✓ ${portal} synced (externalId: ${externalId})`);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          await prisma.portalSync.upsert({
            where: { propertyId_portal: { propertyId, portal } },
            create: { propertyId, portal, status: "ERROR", errorMessage: message },
            update: { status: "ERROR", errorMessage: message },
          });
          console.error(`[PortalSyncWorker] ✗ ${portal} failed: ${message}`);
        }
      })
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      throw new Error(`${failed}/${portals.length} portals failed`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[PortalSyncWorker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[PortalSyncWorker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[PortalSyncWorker] Worker error:", err);
});

console.log("[PortalSyncWorker] Listening for jobs...");

// Graceful shutdown
async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
