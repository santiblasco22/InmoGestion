import { useState } from "react";
import { useAppStore, toUIVisit } from "@/store/useAppStore";
import { ApiVisit } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, MapPin, User, Video, CheckCircle2, XCircle, Loader2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";

const daysOfWeek = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay(); }

const visitColor: Record<string, string> = {
  PRESENCIAL: "bg-accent/15 border-l-accent",
  VIRTUAL: "bg-purple-50 border-l-purple-500",
};

function VisitDetailDialog({ visit, onClose }: { visit: ApiVisit | null; onClose: () => void }) {
  const { updateVisitStatus, deleteVisit } = useAppStore();
  const [saving, setSaving] = useState(false);
  if (!visit) return null;

  const ui = toUIVisit(visit);

  const handleStatus = async (status: ApiVisit["status"]) => {
    setSaving(true);
    try { await updateVisitStatus(visit.id, status); toast.success(`Visita: ${status}`); onClose(); }
    catch { toast.error("No se pudo actualizar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await deleteVisit(visit.id); toast.success("Visita eliminada"); onClose(); }
    catch { toast.error("No se pudo eliminar"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Detalle de visita</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{ui.date}</span><Clock className="h-4 w-4 text-muted-foreground ml-2" /><span>{ui.time}</span></div>
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{ui.clientName}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="truncate">{ui.propertyTitle}</span></div>
          <div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground" />{ui.type}</div>
          <div className="flex items-center gap-2"><span className="text-muted-foreground">Estado:</span><StatusBadge status={ui.status} /></div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleStatus("REALIZADA")} disabled={saving || visit.status === "REALIZADA"}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Realizada</Button>
            <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleStatus("CANCELADA")} disabled={saving || visit.status === "CANCELADA"}><XCircle className="mr-1.5 h-3.5 w-3.5" />Cancelar</Button>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Eliminar visita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleVisitDialog({ open, onClose, initialDate }: { open: boolean; onClose: () => void; initialDate?: string }) {
  const { addVisit, leads, properties } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leadId: "", propertyId: "", date: initialDate ?? "", time: "10:00", type: "PRESENCIAL" });
  const set = (f: string, v: string) => setForm((x) => ({ ...x, [f]: v }));

  const handleSubmit = async () => {
    if (!form.leadId || !form.propertyId || !form.date) return;
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      await addVisit({ leadId: form.leadId, propertyId: form.propertyId, scheduledAt, type: form.type });
      toast.success("Visita agendada");
      setForm({ leadId: "", propertyId: "", date: "", time: "10:00", type: "PRESENCIAL" });
      onClose();
    } catch { toast.error("No se pudo agendar"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Agendar Visita</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label>Cliente *</Label>
            <Select value={form.leadId} onValueChange={(v) => set("leadId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Propiedad *</Label>
            <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha *</Label><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="mt-1" /></div>
            <div><Label>Hora</Label><Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="PRESENCIAL">Presencial</SelectItem><SelectItem value="VIRTUAL">Virtual</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={handleSubmit} disabled={!form.leadId || !form.propertyId || !form.date || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart, visits, onVisitClick, onDayClick,
}: {
  weekStart: Date;
  visits: ApiVisit[];
  onVisitClick: (v: ApiVisit) => void;
  onDayClick: (dateStr: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {days.map((d) => {
          const dateStr = d.toISOString().split("T")[0];
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className="px-2 py-2.5 text-center border-r last:border-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">{daysOfWeek[d.getDay()]}</p>
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold mt-0.5 ${isToday ? "bg-accent text-accent-foreground" : "text-foreground"}`}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 min-h-[300px]">
        {days.map((d) => {
          const dateStr = d.toISOString().split("T")[0];
          const dayVisits = visits.filter((v) => new Date(v.scheduledAt).toISOString().split("T")[0] === dateStr)
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
          return (
            <div
              key={dateStr}
              className="border-r last:border-0 p-1.5 hover:bg-muted/20 cursor-pointer min-h-[200px]"
              onClick={() => onDayClick(dateStr)}
            >
              <div className="space-y-1">
                {dayVisits.map((v) => {
                  const uiv = toUIVisit(v);
                  return (
                    <button
                      key={v.id}
                      onClick={(e) => { e.stopPropagation(); onVisitClick(v); }}
                      className={`w-full text-left rounded px-1.5 py-1 text-[10px] border-l-2 ${visitColor[v.type]} hover:brightness-95`}
                    >
                      <p className="font-semibold text-foreground">{uiv.time}</p>
                      <p className="truncate text-foreground">{uiv.clientName}</p>
                      <p className="truncate text-muted-foreground">{uiv.propertyTitle}</p>
                    </button>
                  );
                })}
                {dayVisits.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 text-center pt-4">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { visits, visitsLoading } = useAppStore();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedVisit, setSelectedVisit] = useState<ApiVisit | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  // Week navigation helpers
  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${weekStart.getDate()} ${monthNames[weekStart.getMonth()].slice(0, 3)} — ${end.getDate()} ${monthNames[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
  })();

  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  const today = new Date().toISOString().split("T")[0];

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getVisitsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return visits.filter((v) => {
      const vDate = new Date(v.scheduledAt).toISOString().split("T")[0];
      return vDate === dateStr;
    });
  };

  const uiUpcoming = visits
    .map(toUIVisit)
    .filter((v) => v.date >= today && v.status !== "Cancelada")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-semibold">Calendario</h1><p className="text-sm text-muted-foreground">Gestión de visitas y agenda</p></div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" className="h-8 rounded-none px-3 gap-1.5" onClick={() => setViewMode("month")}>
              <LayoutGrid className="h-3.5 w-3.5" />Mes
            </Button>
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" className="h-8 rounded-none px-3 gap-1.5" onClick={() => setViewMode("week")}>
              <List className="h-3.5 w-3.5" />Semana
            </Button>
          </div>
          <Button className="bg-primary text-primary-foreground" size="sm" onClick={() => { setScheduleDate(""); setScheduleOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Agendar Visita
          </Button>
        </div>
      </div>

      {visitsLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : viewMode === "week" ? (
        <>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
            <p className="text-sm font-semibold">{weekLabel}</p>
            <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <WeekView
            weekStart={weekStart}
            visits={visits}
            onVisitClick={setSelectedVisit}
            onDayClick={(dateStr) => { setScheduleDate(dateStr); setScheduleOpen(true); }}
          />
        </>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-sm font-semibold">{monthNames[month]} {year}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {daysOfWeek.map((d) => <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const dayVisits = day ? getVisitsForDay(day) : [];
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
              const isToday = dateStr === today;
              return (
                <div key={i} className={`min-h-[100px] border-b border-r p-1.5 ${!day ? "bg-muted/20" : "hover:bg-muted/20 cursor-pointer"}`}
                  onClick={() => { if (!day) return; setScheduleDate(dateStr); setScheduleOpen(true); }}>
                  {day && (
                    <>
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? "bg-accent text-accent-foreground" : "text-foreground"}`}>{day}</span>
                      <div className="mt-1 space-y-1">
                        {dayVisits.slice(0, 2).map((v) => {
                          const uiv = toUIVisit(v);
                          return (
                            <button key={v.id} onClick={(e) => { e.stopPropagation(); setSelectedVisit(v); }}
                              className={`w-full text-left rounded px-1.5 py-1 text-[10px] border-l-2 ${visitColor[v.type]} hover:brightness-95`}>
                              <p className="font-medium text-foreground truncate">{uiv.time} {uiv.clientName}</p>
                              <p className="text-muted-foreground truncate">{uiv.propertyTitle}</p>
                            </button>
                          );
                        })}
                        {dayVisits.length > 2 && <p className="text-[9px] text-muted-foreground px-1">+{dayVisits.length - 2} más</p>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {uiUpcoming.length > 0 && (
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-5 py-3"><h2 className="text-sm font-semibold">Próximas visitas</h2></div>
          <div className="divide-y">
            {uiUpcoming.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedVisit(v._raw as ApiVisit)}>
                <div className="flex items-center gap-4">
                  <div className="text-center w-10">
                    <p className="text-[10px] text-muted-foreground uppercase">{monthNames[parseInt(v.date.split("-")[1]) - 1].slice(0, 3)}</p>
                    <p className="text-lg font-bold leading-none">{parseInt(v.date.split("-")[2])}</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div><p className="text-sm font-medium">{v.clientName}</p><p className="text-xs text-muted-foreground">{v.propertyTitle}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{v.time}</span>
                  <StatusBadge status={v.status} />
                  <span className={`text-xs rounded-full px-2 py-0.5 ${v.type === "Virtual" ? "bg-purple-100 text-purple-700" : "bg-accent/15 text-accent"}`}>{v.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <VisitDetailDialog visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
      <ScheduleVisitDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} initialDate={scheduleDate} />
    </div>
  );
}
