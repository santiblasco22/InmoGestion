import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { enqueuePortalSync } from "../lib/queue";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../middleware/errorHandler";

/** POST /api/portals/sync/:propertyId — Trigger sync for all portals */
export const triggerSync = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, agentId: req.user.id },
  });
  if (!property) throw new AppError(404, "Propiedad no encontrada");

  const portals = ["ZONAPROP", "ARGENPROP", "MERCADOINMUEBLE", "PROPERATI"];

  // Upsert PortalSync records → set to SYNCING
  await Promise.all(
    portals.map((portal) =>
      prisma.portalSync.upsert({
        where: { propertyId_portal: { propertyId, portal: portal as never } },
        create: { propertyId, portal: portal as never, status: "SYNCING" },
        update: { status: "SYNCING", errorMessage: null },
      })
    )
  );

  // Enqueue background job
  const jobId = await enqueuePortalSync({
    propertyId,
    agentId: req.user.id,
    portals,
  });

  res.json({ jobId, message: "Sincronización iniciada", portals });
});

/** GET /api/portals/sync/:propertyId — Sync status per portal */
export const getSyncStatus = asyncHandler(async (req: Request, res: Response) => {
  const { propertyId } = req.params;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, agentId: req.user.id },
  });
  if (!property) throw new AppError(404, "Propiedad no encontrada");

  const syncs = await prisma.portalSync.findMany({ where: { propertyId } });
  res.json(syncs);
});
