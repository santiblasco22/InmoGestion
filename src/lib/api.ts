/**
 * Typed HTTP client for the InmoGestión API.
 * Handles JWT auth headers, token refresh on 401, and JSON parsing.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

// ─── Token storage ────────────────────────────────────────────────────────────

export const tokens = {
  getAccess: () => localStorage.getItem("access_token"),
  getRefresh: () => localStorage.getItem("refresh_token"),
  set: (access: string, refresh: string) => {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  },
  clear: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },
};

// ─── Core fetch ───────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    const rt = tokens.getRefresh();
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) {
        tokens.clear();
        return false;
      }
      const data = await res.json();
      tokens.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      tokens.clear();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {};
  const at = tokens.getAccess();
  if (at) headers["Authorization"] = `Bearer ${at}`;
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  });

  // Token expired → refresh once and retry
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(method, path, body, isFormData, false);
    // Refresh failed — clear tokens and throw so callers can redirect via React Router
    tokens.clear();
    throw new ApiError(401, "Sesión expirada", "SESSION_EXPIRED");
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, json?.error?.code);
  }

  return json as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, formData, true),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post<{ tokens: { accessToken: string; refreshToken: string }; user: ApiUser }>("/auth/register", data),

  login: (email: string, password: string) =>
    api.post<{ tokens: { accessToken: string; refreshToken: string }; user: ApiUser }>("/auth/login", { email, password }),

  logout: (refreshToken: string) =>
    api.post<void>("/auth/logout", { refreshToken }),

  me: () => api.get<{ user: ApiUser }>("/auth/me"),
  updateProfile: (data: { name?: string; phone?: string }) =>
    api.put<{ user: ApiUser }>("/auth/profile", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ message: string }>("/auth/password", { currentPassword, newPassword }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>("/auth/reset-password", { token, newPassword }),
};

// ─── Properties ──────────────────────────────────────────────────────────────

export const propertiesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiPaginatedResponse<ApiProperty>>("/properties?" + toQuery(params)),

  get: (id: string) => api.get<ApiProperty>(`/properties/${id}`),

  create: (data: Partial<ApiProperty>, photos?: File[]) => {
    if (photos?.length) {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined) fd.append(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
      });
      photos.forEach((f) => fd.append("photos", f));
      return api.upload<ApiProperty>("/properties", fd);
    }
    return api.post<ApiProperty>("/properties", data);
  },

  update: (id: string, data: Partial<ApiProperty>) =>
    api.put<ApiProperty>(`/properties/${id}`, data),

  delete: (id: string) => api.delete<void>(`/properties/${id}`),

  addPhotos: (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    return api.upload<{ photos: string[] }>(`/properties/${id}/photos`, fd);
  },

  removePhoto: (id: string, photoKey: string) =>
    api.delete<{ photos: string[] }>(`/properties/${id}/photos/${encodeURIComponent(photoKey)}`),
};

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ApiPaginatedResponse<ApiLead>>("/leads?" + toQuery(params)),

  get: (id: string) => api.get<ApiLead>(`/leads/${id}`),

  create: (data: Partial<ApiLead>) => api.post<ApiLead>("/leads", data),

  update: (id: string, data: Partial<ApiLead>) =>
    api.put<ApiLead>(`/leads/${id}`, data),

  updateStage: (id: string, stage: string) =>
    api.patch<ApiLead>(`/leads/${id}/stage`, { stage }),

  delete: (id: string) => api.delete<void>(`/leads/${id}`),

  addNote: (id: string, content: string) =>
    api.post<ApiNote>(`/leads/${id}/notes`, { content }),

  getNotes: (id: string) => api.get<ApiNote[]>(`/leads/${id}/notes`),
};

// ─── Visits ───────────────────────────────────────────────────────────────────

export const visitsApi = {
  list: (params?: Record<string, string | undefined>) =>
    api.get<ApiPaginatedResponse<ApiVisit>>("/visits?" + toQuery(params)),

  get: (id: string) => api.get<ApiVisit>(`/visits/${id}`),

  create: (data: {
    leadId: string;
    propertyId: string;
    scheduledAt: string;
    type: string;
    notes?: string;
  }) => api.post<ApiVisit>("/visits", data),

  update: (id: string, data: Partial<{ scheduledAt: string; type: string; notes: string }>) =>
    api.put<ApiVisit>(`/visits/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiVisit>(`/visits/${id}/status`, { status }),

  delete: (id: string) => api.delete<void>(`/visits/${id}`),
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  summary: () => api.get<ApiAnalyticsSummary>("/analytics/summary"),
  leadsOverTime: (months = 6) =>
    api.get<{ month: string; leads: number }[]>(`/analytics/leads-over-time?months=${months}`),
  visitsPerProperty: () =>
    api.get<{ propertyId: string; title: string; visits: number }[]>("/analytics/visits-per-property"),
  pipelineFunnel: () =>
    api.get<{ stage: string; count: number }[]>("/analytics/pipeline-funnel"),
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface ApiAgentStats {
  id: string; email: string; name: string; role: string;
  phone?: string | null; createdAt: string;
  _count: { properties: number; leads: number; visits: number };
}

export interface ApiAdminStats {
  totalAgents: number; totalLeads: number; totalProperties: number;
  totalVisits: number; openLeads: number;
}

export const adminApi = {
  stats: () => api.get<ApiAdminStats>("/admin/stats"),
  agents: () => api.get<{ agents: ApiAgentStats[] }>("/admin/agents"),
  leads: () => api.get<{ leads: ApiLead[] }>("/admin/leads"),
  reassignLead: (leadId: string, agentId: string) =>
    api.put<{ lead: ApiLead }>(`/admin/leads/${leadId}/reassign`, { agentId }),
  deleteAgent: (agentId: string) =>
    api.delete<void>(`/admin/agents/${agentId}`),
};

// ─── Portals ─────────────────────────────────────────────────────────────────

export const portalsApi = {
  triggerSync: (propertyId: string) =>
    api.post<{ jobId: string; message: string }>(`/portals/sync/${propertyId}`),
  getSyncStatus: (propertyId: string) =>
    api.get<ApiPortalSync[]>(`/portals/sync/${propertyId}`),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: "AGENT" | "ADMIN";
  avatarUrl?: string | null;
  phone?: string | null;
  createdAt: string;
}

export interface ApiProperty {
  id: string;
  title: string;
  description?: string | null;
  address: string;
  neighborhood: string;
  city: string;
  price: string;
  currency: "ARS" | "USD";
  type: "CASA" | "DEPTO" | "OFICINA" | "PH" | "LOCAL" | "TERRENO";
  status: "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "ALQUILADO";
  rooms: number;
  bathrooms: number;
  area: string;
  amenities: string[];
  photos: string[];
  agentId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { visits: number; leads: number };
}

export interface ApiLead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  budget?: string | null;
  budgetCurrency: "ARS" | "USD";
  source: "WHATSAPP" | "WEB" | "REFERIDO" | "PORTAL" | "OTRO";
  stage: "NUEVO" | "CONTACTADO" | "VISITA_AGENDADA" | "OFERTA_REALIZADA" | "CERRADO_GANADO" | "CERRADO_PERDIDO";
  agentId: string;
  createdAt: string;
  updatedAt: string;
  notes?: ApiNote[];
  interestedProperties?: Pick<ApiProperty, "id" | "title" | "status">[];
  visits?: Pick<ApiVisit, "scheduledAt" | "type">[];
}

export interface ApiVisit {
  id: string;
  leadId: string;
  propertyId: string;
  agentId: string;
  scheduledAt: string;
  type: "PRESENCIAL" | "VIRTUAL";
  status: "PENDIENTE" | "REALIZADA" | "CANCELADA";
  notes?: string | null;
  createdAt: string;
  lead?: Pick<ApiLead, "id" | "name" | "email" | "phone">;
  property?: Pick<ApiProperty, "id" | "title" | "address" | "photos">;
}

export interface ApiNote {
  id: string;
  content: string;
  leadId?: string | null;
  authorId: string;
  createdAt: string;
  author?: { id: string; name: string; avatarUrl?: string | null };
}

export interface ApiAnalyticsSummary {
  activeListings: number;
  leadsThisMonth: number;
  visitsThisMonth: number;
  conversionRate: number;
  closedWon: number;
  revenueEstimateARS: number;
}

export interface ApiPortalSync {
  id: string;
  propertyId: string;
  portal: string;
  externalId?: string | null;
  lastSyncedAt?: string | null;
  status: "PENDING" | "SYNCING" | "SUCCESS" | "ERROR";
  errorMessage?: string | null;
}

export interface ApiPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return "";
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
}
