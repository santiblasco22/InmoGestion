import { Prisma, PropertyStatus, PropertyType, Currency } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { uploadToR2, deleteFromR2, keyFromUrl } from "../lib/r2";
import { triggerPortalSync } from "../lib/portals";

export interface PropertyFilters {
  status?: PropertyStatus;
  type?: PropertyType;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePropertyInput {
  title: string;
  description?: string;
  address: string;
  neighborhood: string;
  city?: string;
  price: number;
  currency?: Currency;
  type: PropertyType;
  status?: PropertyStatus;
  rooms: number;
  bathrooms: number;
  area: number;
  amenities?: string[];
}

/**
 * Returns a paginated list of properties for the authenticated agent.
 * Supports filtering by status, type, neighborhood, price range, and free-text search.
 */
export async function listProperties(agentId: string, filters: PropertyFilters) {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    neighborhood,
    minPrice,
    maxPrice,
    currency,
    search,
  } = filters;

  const where: Prisma.PropertyWhereInput = { agentId };

  if (status) where.status = status;
  if (type) where.type = type;
  if (currency) where.currency = currency;
  if (neighborhood) where.neighborhood = { contains: neighborhood, mode: "insensitive" };
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { neighborhood: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        portalSyncs: { select: { portal: true, status: true, lastSyncedAt: true } },
        _count: { select: { visits: true, leads: true } },
      },
    }),
    prisma.property.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Returns a single property by ID, scoped to the agent.
 */
export async function getProperty(id: string, agentId: string) {
  const property = await prisma.property.findFirst({
    where: { id, agentId },
    include: {
      portalSyncs: true,
      visits: {
        orderBy: { scheduledAt: "desc" },
        take: 10,
        include: { lead: { select: { id: true, name: true, phone: true } } },
      },
      leads: { select: { id: true, name: true, stage: true, phone: true } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  if (!property) throw new AppError(404, "Propiedad no encontrada");
  return property;
}

/**
 * Creates a new property listing, optionally uploading photos to R2.
 */
export async function createProperty(
  agentId: string,
  input: CreatePropertyInput,
  photoFiles?: Express.Multer.File[]
) {
  let photos: string[] = [];
  if (photoFiles?.length) {
    photos = await Promise.all(
      photoFiles.map((f) => uploadToR2(f.buffer, f.originalname, "properties"))
    );
  }

  return prisma.property.create({
    data: {
      ...input,
      price: new Prisma.Decimal(input.price),
      area: new Prisma.Decimal(input.area),
      amenities: input.amenities ?? [],
      photos,
      agentId,
    },
  });
}

/**
 * Updates an existing property. Only the owning agent can update.
 * If status changes to DISPONIBLE and agent has autoPortalSync=true, triggers portal sync.
 */
export async function updateProperty(
  id: string,
  agentId: string,
  input: Partial<CreatePropertyInput>
) {
  const existing = await assertPropertyOwner(id, agentId);

  const data: Prisma.PropertyUpdateInput = { ...input };
  if (input.price !== undefined) data.price = new Prisma.Decimal(input.price);
  if (input.area !== undefined) data.area = new Prisma.Decimal(input.area);

  const updated = await prisma.property.update({ where: { id }, data });

  // Feature 5: Auto-sync portals when property becomes DISPONIBLE
  if (input.status === "DISPONIBLE" && existing.status !== "DISPONIBLE") {
    const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { autoPortalSync: true } });
    if (agent?.autoPortalSync) {
      triggerPortalSync(id, agentId).catch(() => {});
    }
  }

  return updated;
}

/**
 * Permanently deletes a property and removes its R2 photos.
 */
export async function deleteProperty(id: string, agentId: string) {
  const property = await assertPropertyOwner(id, agentId);

  // Delete R2 photos in parallel
  if (property.photos.length) {
    await Promise.allSettled(property.photos.map((url) => deleteFromR2(keyFromUrl(url))));
  }

  await prisma.property.delete({ where: { id } });
}

/**
 * Uploads one or more photos to R2 and appends the URLs to the property's photos array.
 * @returns Updated photos array
 */
export async function addPhotos(
  id: string,
  agentId: string,
  files: Express.Multer.File[]
): Promise<string[]> {
  const property = await assertPropertyOwner(id, agentId);

  const newUrls = await Promise.all(
    files.map((f) => uploadToR2(f.buffer, f.originalname, "properties"))
  );

  const updatedPhotos = [...property.photos, ...newUrls];
  await prisma.property.update({ where: { id }, data: { photos: updatedPhotos } });
  return updatedPhotos;
}

/**
 * Removes a single photo from R2 and from the property's photos array.
 * @param photoKey - R2 storage key (e.g. "properties/uuid.jpg")
 */
export async function removePhoto(
  id: string,
  agentId: string,
  photoKey: string
): Promise<string[]> {
  const property = await assertPropertyOwner(id, agentId);

  const publicUrl = `${process.env.R2_PUBLIC_URL}/${photoKey}`;
  const updatedPhotos = property.photos.filter((p) => p !== publicUrl);

  await Promise.all([
    deleteFromR2(photoKey),
    prisma.property.update({ where: { id }, data: { photos: updatedPhotos } }),
  ]);

  return updatedPhotos;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function assertPropertyOwner(id: string, agentId: string) {
  const property = await prisma.property.findFirst({ where: { id, agentId } });
  if (!property) throw new AppError(404, "Propiedad no encontrada");
  return property;
}
