/**
 * Global app store — fetches data from the API and keeps UI in sync.
 * All mutations call the API first, then update local state on success.
 */
import { create } from "zustand";
import {
  propertiesApi,
  leadsApi,
  visitsApi,
  analyticsApi,
  ApiProperty,
  ApiLead,
  ApiVisit,
  ApiAnalyticsSummary,
} from "@/lib/api";

type LeadInterestedProperty = NonNullable<ApiLead["interestedProperties"]>[number];

// ─── Helpers to map API types to UI-friendly shapes ──────────────────────────

/** Format Decimal string from DB into a plain number */
const toNum = (v: string | number | null | undefined): number =>
  v != null ? Number(v) : 0;

interface AppStore {
  // Data
  leads: ApiLead[];
  properties: ApiProperty[];
  visits: ApiVisit[];
  analytics: ApiAnalyticsSummary | null;

  // Loading states
  leadsLoading: boolean;
  propertiesLoading: boolean;
  visitsLoading: boolean;

  // Properties pagination
  propertiesTotal: number;
  propertiesPage: number;
  propertiesTotalPages: number;

  // Leads pagination
  leadsTotal: number;
  leadsPage: number;

  // Fetch actions
  fetchLeads: (params?: Record<string, string | number>) => Promise<void>;
  loadMoreLeads: () => Promise<void>;
  fetchProperties: (params?: Record<string, string | number>) => Promise<void>;
  fetchVisits: (params?: Record<string, string>) => Promise<void>;
  fetchAnalytics: () => Promise<void>;

  // Lead mutations
  updateLeadStage: (leadId: string, stage: ApiLead["stage"]) => Promise<void>;
  addLead: (data: Partial<ApiLead>) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  addNote: (leadId: string, content: string) => Promise<void>;
  updateNote: (leadId: string, noteId: string, content: string) => Promise<void>;
  deleteNote: (leadId: string, noteId: string) => Promise<void>;
  addLeadProperty: (leadId: string, propertyId: string) => Promise<void>;
  removeLeadProperty: (leadId: string, propertyId: string) => Promise<void>;

  // Property mutations
  addProperty: (data: Partial<ApiProperty>, photos?: File[]) => Promise<void>;
  updateProperty: (propertyId: string, data: Partial<ApiProperty>) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;

  // Visit mutations
  addVisit: (data: { leadId: string; propertyId: string; scheduledAt: string; type: string; notes?: string }) => Promise<void>;
  updateVisitStatus: (visitId: string, status: ApiVisit["status"]) => Promise<void>;
  deleteVisit: (visitId: string) => Promise<void>;
}

const LEADS_PER_PAGE = 100;
const PROPS_PER_PAGE = 12;

export const useAppStore = create<AppStore>((set, get) => ({
  leads: [],
  properties: [],
  visits: [],
  analytics: null,
  leadsLoading: false,
  propertiesLoading: false,
  visitsLoading: false,
  propertiesTotal: 0,
  propertiesPage: 1,
  propertiesTotalPages: 1,
  leadsTotal: 0,
  leadsPage: 1,

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  fetchLeads: async (params) => {
    set({ leadsLoading: true });
    try {
      const res = await leadsApi.list({ limit: LEADS_PER_PAGE, page: 1, ...params });
      set({ leads: res.data, leadsTotal: res.total, leadsPage: 1 });
    } finally {
      set({ leadsLoading: false });
    }
  },

  loadMoreLeads: async () => {
    const { leadsPage, leadsTotal, leads, leadsLoading } = get();
    if (leadsLoading || leads.length >= leadsTotal) return;
    const nextPage = leadsPage + 1;
    set({ leadsLoading: true });
    try {
      const res = await leadsApi.list({ limit: LEADS_PER_PAGE, page: nextPage });
      set((s) => ({
        leads: [...s.leads, ...res.data],
        leadsTotal: res.total,
        leadsPage: nextPage,
      }));
    } finally {
      set({ leadsLoading: false });
    }
  },

  fetchProperties: async (params) => {
    set({ propertiesLoading: true });
    try {
      const res = await propertiesApi.list({ limit: PROPS_PER_PAGE, page: 1, ...params });
      set({
        properties: res.data,
        propertiesTotal: res.total,
        propertiesPage: res.page,
        propertiesTotalPages: res.totalPages,
      });
    } finally {
      set({ propertiesLoading: false });
    }
  },

  fetchVisits: async (params) => {
    set({ visitsLoading: true });
    try {
      const res = await visitsApi.list(params);
      set({ visits: res.data });
    } finally {
      set({ visitsLoading: false });
    }
  },

  fetchAnalytics: async () => {
    const analytics = await analyticsApi.summary();
    set({ analytics });
  },

  // ─── Lead mutations ─────────────────────────────────────────────────────────

  updateLeadStage: async (leadId, stage) => {
    set((s) => ({
      leads: s.leads.map((l) => (l.id === leadId ? { ...l, stage } : l)),
    }));
    try {
      await leadsApi.updateStage(leadId, stage);
    } catch (err) {
      await get().fetchLeads();
      throw err;
    }
  },

  addLead: async (data) => {
    const lead = await leadsApi.create(data);
    set((s) => ({ leads: [lead, ...s.leads], leadsTotal: s.leadsTotal + 1 }));
  },

  deleteLead: async (leadId) => {
    set((s) => ({
      leads: s.leads.filter((l) => l.id !== leadId),
      leadsTotal: Math.max(0, s.leadsTotal - 1),
    }));
    try {
      await leadsApi.delete(leadId);
    } catch (err) {
      await get().fetchLeads();
      throw err;
    }
  },

  addNote: async (leadId, content) => {
    const note = await leadsApi.addNote(leadId, content);
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, notes: [...(l.notes ?? []), note] }
          : l
      ),
    }));
    return note as never;
  },

  updateNote: async (leadId, noteId, content) => {
    await leadsApi.updateNote(leadId, noteId, content);
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, notes: (l.notes ?? []).map((n) => n.id === noteId ? { ...n, content } : n) }
          : l
      ),
    }));
  },

  deleteNote: async (leadId, noteId) => {
    await leadsApi.deleteNote(leadId, noteId);
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, notes: (l.notes ?? []).filter((n) => n.id !== noteId) }
          : l
      ),
    }));
  },

  addLeadProperty: async (leadId, propertyId) => {
    const updated = await leadsApi.addProperty(leadId, propertyId);
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId ? { ...l, interestedProperties: updated.interestedProperties } : l
      ),
    }));
  },

  removeLeadProperty: async (leadId, propertyId) => {
    const updated = await leadsApi.removeProperty(leadId, propertyId);
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId ? { ...l, interestedProperties: updated.interestedProperties } : l
      ),
    }));
  },

  // ─── Property mutations ──────────────────────────────────────────────────────

  addProperty: async (data, photos) => {
    const property = await propertiesApi.create(data, photos);
    set((s) => ({
      properties: [property, ...s.properties],
      propertiesTotal: s.propertiesTotal + 1,
    }));
  },

  updateProperty: async (propertyId, data) => {
    const updated = await propertiesApi.update(propertyId, data);
    set((s) => ({
      properties: s.properties.map((p) => (p.id === propertyId ? updated : p)),
    }));
  },

  deleteProperty: async (propertyId) => {
    set((s) => ({
      properties: s.properties.filter((p) => p.id !== propertyId),
      propertiesTotal: Math.max(0, s.propertiesTotal - 1),
    }));
    try {
      await propertiesApi.delete(propertyId);
    } catch (err) {
      await get().fetchProperties();
      throw err;
    }
  },

  // ─── Visit mutations ─────────────────────────────────────────────────────────

  addVisit: async (data) => {
    const visit = await visitsApi.create(data);
    set((s) => ({ visits: [...s.visits, visit] }));
  },

  updateVisitStatus: async (visitId, status) => {
    set((s) => ({
      visits: s.visits.map((v) => (v.id === visitId ? { ...v, status } : v)),
    }));
    try {
      await visitsApi.updateStatus(visitId, status);
    } catch (err) {
      await get().fetchVisits();
      throw err;
    }
  },

  deleteVisit: async (visitId) => {
    set((s) => ({ visits: s.visits.filter((v) => v.id !== visitId) }));
    try {
      await visitsApi.delete(visitId);
    } catch (err) {
      await get().fetchVisits();
      throw err;
    }
  },
}));

// ─── Compatibility helpers (keep UI pages working with API types) ─────────────

/** Maps an ApiProperty to the shape the UI components expect */
export function toUIProperty(p: ApiProperty) {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    address: p.address,
    neighborhood: p.neighborhood,
    price: toNum(p.price),
    type: ({
      CASA: "Casa", DEPTO: "Departamento", OFICINA: "Comercial",
      PH: "Casa", LOCAL: "Comercial", TERRENO: "Terreno",
    } as Record<string, string>)[p.type] ?? p.type,
    status: ({
      DISPONIBLE: "Disponible", RESERVADO: "Reservado",
      VENDIDO: "Vendido", ALQUILADO: "Alquilado",
    } as Record<string, string>)[p.status] ?? p.status,
    rooms: p.rooms,
    bathrooms: p.bathrooms,
    area: toNum(p.area),
    amenities: p.amenities,
    image: p.photos[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
  };
}

/** Maps an ApiLead to the shape the UI components expect */
export function toUILead(l: ApiLead) {
  const stageMap: Record<string, string> = {
    NUEVO: "Nuevo", CONTACTADO: "Contactado", VISITA_AGENDADA: "Visita Agendada",
    OFERTA_REALIZADA: "Oferta Realizada", CERRADO_GANADO: "Cerrado Ganado", CERRADO_PERDIDO: "Cerrado Perdido",
  };
  const sourceMap: Record<string, string> = {
    WHATSAPP: "WhatsApp", WEB: "Web", REFERIDO: "Referido", PORTAL: "Portal", OTRO: "Otro",
  };
  return {
    id: l.id,
    name: l.name,
    email: l.email ?? "",
    phone: l.phone ?? "",
    budget: (() => {
      if (!l.budget) return "—";
      const n = toNum(l.budget);
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M ARS`;
      if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K ARS`;
      return `$${n.toLocaleString("es-AR")} ARS`;
    })(),
    source: (sourceMap[l.source] ?? l.source) as "WhatsApp" | "Web" | "Referido" | "Portal",
    stage: (stageMap[l.stage] ?? l.stage) as import("@/data/mockData").Lead["stage"],
    propertyInterest: l.interestedProperties?.[0]?.title ?? "—",
    lastContact: l.updatedAt.split("T")[0],
    lastActivity: l.notes?.[0]?.content ?? "—",
    notes: (l.notes ?? []).map((n) => ({ date: n.createdAt.split("T")[0], text: n.content })),
    _raw: l,
  };
}

/** Maps an ApiVisit to the shape the UI components expect */
export function toUIVisit(v: ApiVisit) {
  const statusMap: Record<string, string> = {
    PENDIENTE: "Pendiente", REALIZADA: "Completada", CANCELADA: "Cancelada",
  };
  const dt = new Date(v.scheduledAt);
  return {
    id: v.id,
    clientName: v.lead?.name ?? "—",
    propertyAddress: v.property?.address ?? "—",
    propertyTitle: v.property?.title ?? "—",
    date: dt.toISOString().split("T")[0],
    time: dt.toTimeString().slice(0, 5),
    type: v.type === "PRESENCIAL" ? "Presencial" : "Virtual",
    status: (statusMap[v.status] ?? v.status) as import("@/data/mockData").Visit["status"],
    _raw: v,
  };
}
