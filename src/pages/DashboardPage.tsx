import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, CalendarDays, TrendingUp, Plus, Eye, ArrowRight, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAppStore, toUILead, toUIVisit } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

const funnelColors = [
  "hsl(196, 73%, 38%)", "hsl(196, 73%, 48%)", "hsl(196, 73%, 58%)",
  "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)",
];

const STAGES = ["NUEVO", "CONTACTADO", "VISITA_AGENDADA", "OFERTA_REALIZADA", "CERRADO_GANADO", "CERRADO_PERDIDO"] as const;
const STAGE_LABELS: Record<string, string> = {
  NUEVO: "Nuevo", CONTACTADO: "Contactado", VISITA_AGENDADA: "Visita Agendada",
  OFERTA_REALIZADA: "Oferta Realizada", CERRADO_GANADO: "Cerrado Ganado", CERRADO_PERDIDO: "Cerrado Perdido",
};

function QuickVisitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addVisit, leads, properties } = useAppStore();
  const [form, setForm] = useState({ leadId: "", propertyId: "", date: "", time: "10:00", type: "PRESENCIAL" });
  const set = (f: string, v: string) => setForm((x) => ({ ...x, [f]: v }));

  const handleSubmit = async () => {
    if (!form.leadId || !form.propertyId || !form.date) return;
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      await addVisit({ leadId: form.leadId, propertyId: form.propertyId, scheduledAt, type: form.type });
      toast.success("Visita agendada");
      setForm({ leadId: "", propertyId: "", date: "", time: "10:00", type: "PRESENCIAL" });
      onClose();
    } catch { toast.error("No se pudo agendar la visita"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Agendar Visita</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Cliente</Label>
            <Select value={form.leadId} onValueChange={(v) => set("leadId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Propiedad</Label>
            <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha</Label><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="mt-1" /></div>
            <div><Label>Hora</Label><Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className="mt-1" /></div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                <SelectItem value="VIRTUAL">Virtual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={handleSubmit} disabled={!form.leadId || !form.propertyId || !form.date}>Agendar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addLead, properties } = useAppStore();
  const [form, setForm] = useState({ name: "", phone: "", propertyId: "", source: "WEB" });
  const set = (f: string, v: string) => setForm((x) => ({ ...x, [f]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      await addLead({ name: form.name, phone: form.phone || undefined, source: form.source as never, stage: "NUEVO", propertyIds: form.propertyId ? [form.propertyId] : [] } as never);
      toast.success(`Lead "${form.name}" creado`);
      setForm({ name: "", phone: "", propertyId: "", source: "WEB" });
      onClose();
    } catch { toast.error("No se pudo crear el lead"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Nuevo Lead</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label>Nombre *</Label><Input placeholder="Nombre completo" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1" /></div>
          <div><Label>Teléfono</Label><Input placeholder="+54 11 ..." value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" /></div>
          <div>
            <Label>Propiedad de interés</Label>
            <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Opcional..." /></SelectTrigger>
              <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fuente</Label>
            <Select value={form.source} onValueChange={(v) => set("source", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WEB">Web</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="REFERIDO">Referido</SelectItem>
                <SelectItem value="PORTAL">Portal</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-accent text-accent-foreground" onClick={handleSubmit} disabled={!form.name.trim()}>Crear Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FOLLOWUP_DAYS = 3;
const NO_INTEREST_DAYS = 30;

function AlertsWidget() {
  const navigate = useNavigate();
  const { leads, visits, properties } = useAppStore();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const alerts = useMemo(() => {
    // Leads urgentes: sin actividad FOLLOWUP_DAYS días, stage activo
    const urgentLeads = leads
      .filter((l) => {
        const days = differenceInDays(today, new Date(l.updatedAt));
        return days >= FOLLOWUP_DAYS && !["CERRADO_GANADO", "CERRADO_PERDIDO"].includes(l.stage);
      })
      .sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1))
      .slice(0, 4);

    // Visitas de hoy
    const todayVisits = visits
      .filter((v) => v.scheduledAt?.startsWith(todayStr) && v.status === "PENDIENTE")
      .slice(0, 3);

    // Propiedades sin interesados en 30 días
    const staleProps = properties
      .filter((p) => {
        if (p.status !== "DISPONIBLE") return false;
        const days = differenceInDays(today, new Date(p.updatedAt));
        return days >= NO_INTEREST_DAYS && (p._count?.leads ?? 0) === 0;
      })
      .slice(0, 3);

    return { urgentLeads, todayVisits, staleProps };
  }, [leads, visits, properties]);

  const totalAlerts = alerts.urgentLeads.length + alerts.todayVisits.length + alerts.staleProps.length;
  if (totalAlerts === 0) return null;

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-foreground">Alertas inteligentes</h2>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold">{totalAlerts}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
        {/* Leads urgentes */}
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />Sin seguimiento ({alerts.urgentLeads.length})
          </p>
          {alerts.urgentLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todo al día</p>
          ) : (
            alerts.urgentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5 -mx-1" onClick={() => navigate("/leads")}>
                <p className="text-xs text-foreground truncate">{l.name}</p>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[10px] text-muted-foreground">{differenceInDays(today, new Date(l.updatedAt))}d</span>
                  {l.aiScore != null && (
                    <span className={`text-[10px] font-bold px-1.5 rounded-full ${l.aiScore >= 70 ? "bg-green-500/15 text-green-400" : l.aiScore >= 40 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>{l.aiScore}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Visitas de hoy */}
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />Visitas de hoy ({alerts.todayVisits.length})
          </p>
          {alerts.todayVisits.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin visitas hoy</p>
          ) : (
            alerts.todayVisits.map((v) => (
              <div key={v.id} className="cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5 -mx-1" onClick={() => navigate("/calendario")}>
                <p className="text-xs text-foreground truncate">{v.lead?.name ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{v.property?.title ?? "—"}</p>
              </div>
            ))
          )}
        </div>

        {/* Propiedades sin interés */}
        <div className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />Sin interesados +{NO_INTEREST_DAYS}d ({alerts.staleProps.length})
          </p>
          {alerts.staleProps.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todas con actividad</p>
          ) : (
            alerts.staleProps.map((p) => (
              <div key={p.id} className="cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5 -mx-1" onClick={() => navigate("/propiedades")}>
                <p className="text-xs text-foreground truncate">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{p.neighborhood}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { leads, visits, properties, analytics } = useAppStore();
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const activeProperties = properties.filter((p) => p.status === "DISPONIBLE" || p.status === "RESERVADO").length;
  const newLeads = leads.filter((l) => l.stage === "NUEVO").length;

  const pipelineFunnel = STAGES.slice(0, 5).map((stage) => ({
    stage: STAGE_LABELS[stage],
    count: leads.filter((l) => l.stage === stage).length,
  }));

  const stats = [
    { title: "Publicaciones activas", value: analytics?.activeListings ?? activeProperties, icon: Building2, trend: "En el mercado" },
    { title: "Leads nuevos", value: newLeads, icon: Users, trend: `${leads.length} totales` },
    { title: "Visitas este mes", value: analytics?.visitsThisMonth ?? 0, icon: CalendarDays },
    { title: "Tasa de conversión", value: `${analytics?.conversionRate ?? 0}%`, icon: TrendingUp, trend: `${analytics?.closedWon ?? 0} cierres` },
  ];

  const uiVisits = visits.map(toUIVisit);
  const upcomingVisits = uiVisits
    .filter((v) => v.date >= today && v.status !== "Cancelada")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 5);

  const uiLeads = [...leads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6).map(toUILead);

  const firstName = user?.name?.split(" ")[0] ?? "agente";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Bienvenida, {firstName}. Resumen de tu actividad inmobiliaria.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Leads recientes</h2>
            <Button variant="ghost" size="sm" className="text-accent text-xs gap-1" onClick={() => navigate("/leads")}>
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground bg-muted/20">
                  <th className="px-5 py-2.5 font-medium">Nombre</th>
                  <th className="px-5 py-2.5 font-medium hidden md:table-cell">Propiedad</th>
                  <th className="px-5 py-2.5 font-medium">Estado</th>
                  <th className="px-5 py-2.5 font-medium hidden sm:table-cell">Contacto</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {uiLeads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/leads")}>
                    <td className="px-5 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell max-w-[150px] truncate">{lead.propertyInterest}</td>
                    <td className="px-5 py-3"><StatusBadge status={lead.stage} /></td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell text-xs">{lead.lastContact}</td>
                    <td className="px-5 py-3"><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
                {uiLeads.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Sin leads aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5 shadow-sm space-y-2.5">
            <h2 className="text-sm font-semibold text-foreground">Acciones rápidas</h2>
            <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90" size="sm" onClick={() => navigate("/propiedades")}>
              <Plus className="mr-2 h-4 w-4" />Agregar Propiedad
            </Button>
            <Button className="w-full justify-start bg-accent text-accent-foreground hover:bg-accent/90" size="sm" onClick={() => setLeadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Agregar Lead
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setVisitDialogOpen(true)}>
              <CalendarDays className="mr-2 h-4 w-4" />Agendar Visita
            </Button>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Pipeline de leads</h2>
              <Button variant="ghost" size="sm" className="text-accent text-xs gap-1 h-7" onClick={() => navigate("/leads")}>
                Ver <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineFunnel} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => [`${v} leads`, "Cantidad"]} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {pipelineFunnel.map((_, i) => <Cell key={i} fill={funnelColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Próximas visitas</h2>
          <Button variant="ghost" size="sm" className="text-accent text-xs gap-1" onClick={() => navigate("/calendario")}>
            Ver calendario <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {upcomingVisits.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x">
            {upcomingVisits.map((v) => (
              <div key={v.id} className="px-5 py-4 space-y-1 hover:bg-muted/30 cursor-pointer" onClick={() => navigate("/calendario")}>
                <p className="text-xs text-muted-foreground font-medium">{v.date} · {v.time}</p>
                <p className="text-sm font-medium text-foreground truncate">{v.propertyTitle}</p>
                <p className="text-xs text-muted-foreground">{v.clientName}</p>
                <div className="flex gap-1 flex-wrap">
                  <StatusBadge status={v.status} />
                  <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${v.type === "Virtual" ? "bg-purple-100 text-purple-700" : "bg-accent/15 text-accent"}`}>{v.type}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">No hay visitas programadas próximamente.</div>
        )}
      </div>

      <AlertsWidget />

      <QuickVisitDialog open={visitDialogOpen} onClose={() => setVisitDialogOpen(false)} />
      <QuickLeadDialog open={leadDialogOpen} onClose={() => setLeadDialogOpen(false)} />
    </div>
  );
}
