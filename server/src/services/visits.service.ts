import { VisitStatus, VisitType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { sendVisitConfirmation } from "../lib/resend";

export interface VisitFilters {
  from?: string;
  to?: string;
  leadId?: string;
  propertyId?: string;
  status?: VisitStatus;
  page?: number;
  limit?: number;
}

export interface CreateVisitInput {
  leadId: string;
  propertyId: string;
  scheduledAt: string; // ISO date string
  type: VisitType;
  notes?: string;
}

/**
 * Returns visits for the agent, optionally filtered by date range, lead, property, or status.
 */
export async function listVisits(agentId: string, filters: VisitFilters) {
  const { from, to, leadId, propertyId, status, page = 1, limit = 50 } = filters;

  const where: Record<string, unknown> = { agentId };
  if (leadId) where.leadId = leadId;
  if (propertyId) where.propertyId = propertyId;
  if (status) where.status = status;
  if (from || to) {
    where.scheduledAt = {};
    if (from) (where.scheduledAt as Record<string, unknown>).gte = new Date(from);
    if (to) (where.scheduledAt as Record<string, unknown>).lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.visit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledAt: "asc" },
      include: {
        lead: { select: { id: true, name: true, email: true, phone: true } },
        property: { select: { id: true, title: true, address: true, photos: true } },
      },
    }),
    prisma.visit.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Returns a single visit by ID, scoped to the agent.
 */
export async function getVisit(id: string, agentId: string) {
  const visit = await prisma.visit.findFirst({
    where: { id, agentId },
    include: {
      lead: { select: { id: true, name: true, email: true, phone: true } },
      property: { select: { id: true, title: true, address: true, neighborhood: true } },
    },
  });
  if (!visit) throw new AppError(404, "Visita no encontrada");
  return visit;
}

/**
 * Schedules a new visit between a lead and a property.
 * Sends a confirmation email to the lead if they have an email address.
 */
export async function createVisit(agentId: string, input: CreateVisitInput) {
  const scheduledAt = new Date(input.scheduledAt);

  // Verify lead and property belong to agent
  const [lead, property] = await Promise.all([
    prisma.lead.findFirst({ where: { id: input.leadId, agentId } }),
    prisma.property.findFirst({ where: { id: input.propertyId, agentId } }),
  ]);

  if (!lead) throw new AppError(404, "Lead no encontrado");
  if (!property) throw new AppError(404, "Propiedad no encontrada");

  const visit = await prisma.visit.create({
    data: {
      ...input,
      scheduledAt,
      agentId,
    },
    include: {
      lead: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true } },
    },
  });

  // Send email confirmation if lead has email
  if (visit.lead.email) {
    sendVisitConfirmation(
      visit.lead.email,
      visit.lead.name,
      visit.property.title,
      scheduledAt,
      input.type
    ).catch(() => {});
  }

  // Log activity on the lead
  const dateStr = scheduledAt.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = scheduledAt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  prisma.note.create({
    data: {
      content: `[ACTIVIDAD] Visita ${input.type === "PRESENCIAL" ? "presencial" : "virtual"} agendada para el ${dateStr} a las ${timeStr} en "${visit.property.title}"`,
      leadId: input.leadId,
      authorId: agentId,
    },
  }).catch(() => {});

  return visit;
}

/**
 * Updates visit details (date, type, notes). Only pending visits can be fully edited.
 */
export async function updateVisit(
  id: string,
  agentId: string,
  input: Partial<CreateVisitInput>
) {
  const visit = await assertVisitOwner(id, agentId);
  if (visit.status === "REALIZADA") {
    throw new AppError(400, "No se puede editar una visita ya realizada");
  }

  const data: Record<string, unknown> = { ...input };
  if (input.scheduledAt) data.scheduledAt = new Date(input.scheduledAt);

  return prisma.visit.update({ where: { id }, data });
}

/**
 * Updates only the status of a visit (PENDIENTE → REALIZADA | CANCELADA).
 */
export async function updateVisitStatus(id: string, agentId: string, status: VisitStatus) {
  await assertVisitOwner(id, agentId);
  return prisma.visit.update({ where: { id }, data: { status } });
}

/**
 * Deletes a visit. Only PENDIENTE visits may be deleted.
 */
export async function deleteVisit(id: string, agentId: string) {
  const visit = await assertVisitOwner(id, agentId);
  if (visit.status === "REALIZADA") {
    throw new AppError(400, "No se puede eliminar una visita ya realizada");
  }
  await prisma.visit.delete({ where: { id } });
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function assertVisitOwner(id: string, agentId: string) {
  const visit = await prisma.visit.findFirst({ where: { id, agentId } });
  if (!visit) throw new AppError(404, "Visita no encontrada");
  return visit;
}
