import { Prisma, LeadStage, LeadSource, Currency } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { matchProperties } from "../lib/ai";

export interface LeadFilters {
  stage?: LeadStage;
  source?: LeadSource;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  budget?: number;
  budgetCurrency?: Currency;
  source: LeadSource;
  stage?: LeadStage;
  propertyIds?: string[];
  prefZones?: string[];
  prefTypes?: string[];
  prefMinRooms?: number;
  prefMaxRooms?: number;
  prefCondition?: string;
}

/**
 * Returns a paginated list of leads for the agent, with optional filters.
 */
export async function listLeads(agentId: string, filters: LeadFilters) {
  const { page = 1, limit = 50, stage, source, search } = filters;

  const where: Prisma.LeadWhereInput = { agentId };
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 5 },
        interestedProperties: { select: { id: true, title: true, status: true } },
        visits: {
          where: { status: "PENDIENTE" },
          orderBy: { scheduledAt: "asc" },
          take: 1,
          select: { scheduledAt: true, type: true },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Returns a single lead with full details (notes, properties, visits).
 */
export async function getLead(id: string, agentId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id, agentId },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      },
      interestedProperties: {
        select: { id: true, title: true, address: true, price: true, currency: true, status: true, photos: true },
      },
      visits: {
        orderBy: { scheduledAt: "desc" },
        include: { property: { select: { id: true, title: true, address: true } } },
      },
    },
  });

  if (!lead) throw new AppError(404, "Lead no encontrado");
  return lead;
}

/**
 * Creates a new lead and optionally links it to interested properties.
 * If agent has autoMatchProperties=true and pref fields are present, auto-runs AI matching.
 */
export async function createLead(agentId: string, input: CreateLeadInput) {
  const { propertyIds, budget, ...rest } = input;

  const lead = await prisma.lead.create({
    data: {
      ...rest,
      budget: budget !== undefined ? new Prisma.Decimal(budget) : undefined,
      agentId,
      interestedProperties: propertyIds?.length
        ? { connect: propertyIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { interestedProperties: { select: { id: true, title: true } } },
  });

  // Feature 3: Auto-match properties when pref fields are present
  const hasPrefFields = (input.prefZones?.length ?? 0) > 0 || (input.prefTypes?.length ?? 0) > 0 || input.prefMinRooms || input.prefMaxRooms;
  if (hasPrefFields && !propertyIds?.length) {
    const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { autoMatchProperties: true } });
    if (agent?.autoMatchProperties) {
      // Fire-and-forget: run AI match and attach top result
      (async () => {
        try {
          const props = await prisma.property.findMany({
            where: { agentId, status: "DISPONIBLE" },
            select: { id: true, title: true, price: true, currency: true, type: true, neighborhood: true, city: true, rooms: true, area: true, status: true },
            take: 20,
          });
          if (!props.length) return;
          const matches = await matchProperties(
            { name: lead.name, budget: lead.budget?.toString() ?? null, budgetCurrency: lead.budgetCurrency, notes: [] },
            props.map((p) => ({ ...p, price: p.price.toString(), area: p.area.toString() }))
          );
          if (matches[0]?.propertyId) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: { interestedProperties: { connect: [{ id: matches[0].propertyId }] } },
            });
          }
        } catch {
          // Silent fail — lead is already created
        }
      })();
    }
  }

  return lead;
}

/**
 * Updates a lead's fields. Only the owning agent can update.
 */
export async function updateLead(
  id: string,
  agentId: string,
  input: Partial<CreateLeadInput>
) {
  await assertLeadOwner(id, agentId);

  const { propertyIds, budget, ...rest } = input;
  const data: Prisma.LeadUpdateInput = { ...rest };
  if (budget !== undefined) data.budget = new Prisma.Decimal(budget);
  if (propertyIds) {
    data.interestedProperties = { set: propertyIds.map((id) => ({ id })) };
  }

  return prisma.lead.update({ where: { id }, data });
}

/**
 * Moves a lead to a new pipeline stage (optimistic, lightweight update).
 */
export async function updateLeadStage(id: string, agentId: string, stage: LeadStage) {
  await assertLeadOwner(id, agentId);
  return prisma.lead.update({ where: { id }, data: { stage } });
}

/**
 * Permanently deletes a lead and its related notes.
 */
export async function deleteLead(id: string, agentId: string) {
  await assertLeadOwner(id, agentId);
  await prisma.lead.delete({ where: { id } });
}

/**
 * Adds a note to a lead's timeline.
 */
export async function addNote(leadId: string, agentId: string, content: string) {
  // Verify lead belongs to agent
  await assertLeadOwner(leadId, agentId);

  return prisma.note.create({
    data: { content, leadId, authorId: agentId },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

/**
 * Returns all notes for a lead, ordered chronologically.
 */
export async function getLeadNotes(leadId: string, agentId: string) {
  await assertLeadOwner(leadId, agentId);

  return prisma.note.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function assertLeadOwner(id: string, agentId: string) {
  const lead = await prisma.lead.findFirst({ where: { id, agentId } });
  if (!lead) throw new AppError(404, "Lead no encontrado");
  return lead;
}
