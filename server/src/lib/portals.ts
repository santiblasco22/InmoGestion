import { prisma } from "./prisma";
import { enqueuePortalSync } from "./queue";

const ALL_PORTALS = ["ZONAPROP", "ARGENPROP", "MERCADOINMUEBLE", "PROPERATI"];

/**
 * Marks all portal sync records as SYNCING and enqueues the background job.
 * Used both by the portals controller and by automated triggers.
 */
export async function triggerPortalSync(propertyId: string, agentId: string): Promise<string> {
  await Promise.all(
    ALL_PORTALS.map((portal) =>
      prisma.portalSync.upsert({
        where: { propertyId_portal: { propertyId, portal: portal as never } },
        create: { propertyId, portal: portal as never, status: "SYNCING" },
        update: { status: "SYNCING", errorMessage: null },
      })
    )
  );
  return enqueuePortalSync({ propertyId, agentId, portals: ALL_PORTALS });
}
