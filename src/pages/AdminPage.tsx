import { useEffect, useState } from "react";
import { adminApi, ApiAgentStats, ApiAdminStats, ApiLead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Users, Building2, CalendarDays, TrendingUp, RefreshCw, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}

function ReassignDialog({
  lead, agents, onClose,
}: { lead: ApiLead | null; agents: ApiAgentStats[]; onClose: () => void }) {
  const [agentId, setAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (lead) setAgentId(lead.agentId ?? ""); }, [lead?.id]);

  if (!lead) return null;

  const handleSave = async () => {
    if (!agentId || agentId === lead.agentId) return;
    setSaving(true);
    try {
      await adminApi.reassignLead(lead.id, agentId);
      toast.success("Lead reasignado correctamente");
      onClose();
    } catch {
      toast.error("No se pudo reasignar el lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Reasignar lead</DialogTitle>
        </DialogHeader>
        <div className="py-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Lead: <span className="font-medium text-foreground">{lead.name}</span>
          </p>
          <div>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar agente..." /></SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} {a.id === lead.agentId ? "(actual)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            className="bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={saving || !agentId || agentId === lead.agentId}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            Reasignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [agents, setAgents] = useState<ApiAgentStats[]>([]);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignLead, setReassignLead] = useState<ApiLead | null>(null);
  const [tab, setTab] = useState<"agents" | "leads">("agents");

  const load = async () => {
    setLoading(true);
    try {
      const [s, a, l] = await Promise.all([
        adminApi.stats(),
        adminApi.agents(),
        adminApi.leads(),
      ]);
      setStats(s);
      setAgents(a.agents);
      setLeads(l.leads);
    } catch {
      toast.error("No se pudo cargar el panel de admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const STAGE_LABELS: Record<string, string> = {
    NUEVO: "Nuevo", CONTACTADO: "Contactado", VISITA_AGENDADA: "Visita Agendada",
    OFERTA_REALIZADA: "Oferta Realizada", CERRADO_GANADO: "Cerrado Ganado", CERRADO_PERDIDO: "Cerrado Perdido",
  };

  const stageColor: Record<string, string> = {
    NUEVO: "bg-purple-100 text-purple-700",
    CONTACTADO: "bg-blue-100 text-blue-700",
    VISITA_AGENDADA: "bg-teal-100 text-teal-700",
    OFERTA_REALIZADA: "bg-amber-100 text-amber-700",
    CERRADO_GANADO: "bg-green-100 text-green-700",
    CERRADO_PERDIDO: "bg-red-100 text-red-700",
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Vista global de la plataforma</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />Actualizar
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Agentes" value={stats.totalAgents} icon={Users} color="bg-primary" />
          <StatCard title="Propiedades" value={stats.totalProperties} icon={Building2} color="bg-accent" />
          <StatCard title="Leads totales" value={stats.totalLeads} icon={Users} color="bg-purple-500" />
          <StatCard title="Leads activos" value={stats.openLeads} icon={TrendingUp} color="bg-amber-500" />
          <StatCard title="Visitas" value={stats.totalVisits} icon={CalendarDays} color="bg-green-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["agents", "leads"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "agents" ? `Agentes (${agents.length})` : `Leads (${leads.length})`}
          </button>
        ))}
      </div>

      {/* Agents table */}
      {tab === "agents" && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Agente</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium text-center">Propiedades</th>
                <th className="px-5 py-3 font-medium text-center">Leads</th>
                <th className="px-5 py-3 font-medium text-center">Visitas</th>
                <th className="px-5 py-3 font-medium">Miembro desde</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {a.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={a.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                      {a.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-center font-semibold">{a._count.properties}</td>
                  <td className="px-5 py-3 text-center font-semibold">{a._count.leads}</td>
                  <td className="px-5 py-3 text-center font-semibold">{a._count.visits}</td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">
                    {new Date(a.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leads table with reassign */}
      {tab === "leads" && (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20 text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Etapa</th>
                <th className="px-5 py-3 font-medium">Fuente</th>
                <th className="px-5 py-3 font-medium">Agente</th>
                <th className="px-5 py-3 font-medium">Creado</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <p className="font-medium">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.email ?? l.phone ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${stageColor[l.stage] ?? "bg-muted text-muted-foreground"}`}>
                      {STAGE_LABELS[l.stage] ?? l.stage}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs">{l.source}</td>
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium">{(l as never as { agent?: { name: string } }).agent?.name ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-5 py-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setReassignLead(l)}>
                      <ArrowRightLeft className="h-3 w-3" />Reasignar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Sin leads</div>}
        </div>
      )}

      <ReassignDialog
        lead={reassignLead}
        agents={agents}
        onClose={() => { setReassignLead(null); load(); }}
      />
    </div>
  );
}
