import { useState, useEffect } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { useAppStore, toUILead } from "@/store/useAppStore";
import { ApiLead } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { FirmaDigital } from "@/components/FirmaDigital";
import { ImportLeadsDialog } from "@/components/ImportLeadsDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Phone, MessageCircle, Building2, Plus, Send, Trash2, UserPlus, Loader2, Copy, FileSignature, ChevronDown, Search, X, Upload, GitCommitHorizontal, CalendarDays, CheckSquare, Square, Bell, AlarmClock } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocation } from "react-router-dom";

type Stage = ApiLead["stage"];

const STAGES: Stage[] = ["NUEVO", "CONTACTADO", "VISITA_AGENDADA", "OFERTA_REALIZADA", "CERRADO_GANADO", "CERRADO_PERDIDO"];

const STAGE_LABELS: Record<Stage, string> = {
  NUEVO: "Nuevo", CONTACTADO: "Contactado", VISITA_AGENDADA: "Visita Agendada",
  OFERTA_REALIZADA: "Oferta Realizada", CERRADO_GANADO: "Cerrado Ganado", CERRADO_PERDIDO: "Cerrado Perdido",
};

const stageTopColor: Record<Stage, string> = {
  NUEVO: "border-t-purple-500", CONTACTADO: "border-t-blue-500",
  VISITA_AGENDADA: "border-t-teal-500", OFERTA_REALIZADA: "border-t-amber-500",
  CERRADO_GANADO: "border-t-green-500", CERRADO_PERDIDO: "border-t-red-500",
};

const stageHeaderColor: Record<Stage, string> = {
  NUEVO: "text-purple-700", CONTACTADO: "text-blue-700",
  VISITA_AGENDADA: "text-teal-700", OFERTA_REALIZADA: "text-amber-700",
  CERRADO_GANADO: "text-green-700", CERRADO_PERDIDO: "text-red-700",
};

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WA", WEB: "Web", REFERIDO: "Ref", PORTAL: "Portal", OTRO: "Otro",
};

// ─── Draggable card ───────────────────────────────────────────────────────────

function LeadCard({ lead, onClick, isDragging = false }: { lead: ApiLead; onClick?: () => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  const ui = toUILead(lead);
  const style = transform ? { transform: `translate(${transform.x}px,${transform.y}px)` } : undefined;

  return (
    <div
      ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick}
      className={`w-full text-left rounded-lg border border-t-2 ${stageTopColor[lead.stage]} bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none ${isDragging ? "opacity-40" : ""}`}
    >
      <p className="text-sm font-medium text-foreground">{lead.name}</p>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{ui.propertyInterest}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-medium text-foreground">{ui.budget}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
          {SOURCE_LABELS[lead.source] ?? lead.source}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1.5 truncate">{ui.lastActivity}</p>
    </div>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function KanbanColumn({ stage, leads, onLeadClick, activeId }: {
  stage: Stage; leads: ApiLead[]; onLeadClick: (l: ApiLead) => void; activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={`min-w-[260px] w-[260px] shrink-0 flex flex-col gap-3 rounded-xl p-3 transition-colors ${isOver ? "bg-accent/10" : "bg-muted/40"}`}>
      <div className="flex items-center justify-between px-1">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${stageHeaderColor[stage]}`}>{STAGE_LABELS[stage]}</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card border text-[10px] font-semibold text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[60px]">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} isDragging={activeId === lead.id} />
        ))}
        {leads.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">Sin leads</div>
        )}
      </div>
    </div>
  );
}

// ─── WhatsApp message templates ───────────────────────────────────────────────

const WA_TEMPLATES: Record<Stage, { label: string; message: (name: string, property?: string) => string }[]> = {
  NUEVO: [
    { label: "Saludo inicial", message: (n) => `Hola ${n}, te contacto desde InmoGestión. Vi que consultaste por una de nuestras propiedades. ¿Tenés unos minutos para hablar?` },
    { label: "Presentación", message: (n, p) => `Hola ${n}! Soy tu agente en InmoGestión. Quería presentarme y contarte sobre ${p ?? "la propiedad"} que te interesó. ¿Cuándo sería buen momento para charlar?` },
  ],
  CONTACTADO: [
    { label: "Seguimiento", message: (n) => `Hola ${n}, ¿cómo estás? Quería saber si pudiste ver la información que te compartí. ¿Tenés alguna pregunta?` },
    { label: "Propuesta de visita", message: (n, p) => `Hola ${n}! ¿Qué te pareció ${p ?? "la propiedad"}? Me gustaría coordinar una visita para que la conozcas en persona. ¿Qué días te quedan bien esta semana?` },
  ],
  VISITA_AGENDADA: [
    { label: "Confirmación 24hs antes", message: (n, p) => `Hola ${n}, te recuerdo que mañana tenemos la visita a ${p ?? "la propiedad"}. ¿Confirmás que podés venir? Cualquier cambio avisame con anticipación.` },
    { label: "El día de la visita", message: (n) => `Hola ${n}! Hoy es el día de la visita. ¿Estás en camino? Cualquier consulta avisame.` },
  ],
  OFERTA_REALIZADA: [
    { label: "Seguimiento de oferta", message: (n) => `Hola ${n}, ¿cómo andás? Quería saber si pudiste revisar la oferta que presentamos. ¿Hay algo que te genere dudas?` },
    { label: "Negociación", message: (n, p) => `Hola ${n}! Hablé con el propietario de ${p ?? "la propiedad"} y hay margen para negociar. ¿Podemos hablar hoy para avanzar?` },
  ],
  CERRADO_GANADO: [
    { label: "Felicitación", message: (n, p) => `¡Felicitaciones ${n}! La operación sobre ${p ?? "la propiedad"} fue un éxito. Fue un placer acompañarte en este proceso. Cualquier cosa que necesites, acá estoy.` },
    { label: "Referidos", message: (n) => `Hola ${n}, espero que estés disfrutando tu nueva propiedad. Si conocés alguien que esté buscando, no dudes en recomendarme. ¡Muchas gracias por confiar en mí!` },
  ],
  CERRADO_PERDIDO: [
    { label: "Mantenerse en contacto", message: (n) => `Hola ${n}, entiendo que por ahora no pudimos avanzar. Si en algún momento retomás la búsqueda, con gusto te ayudo. ¡Éxitos!` },
  ],
};

// ─── Lead detail panel ────────────────────────────────────────────────────────

// ─── Note parsers ─────────────────────────────────────────────────────────────

function parseTarea(note: { id: string; content: string; createdAt: string }) {
  try {
    const data = JSON.parse(note.content.replace("[TAREA] ", ""));
    return { id: note.id, title: data.title as string, done: Boolean(data.done), dueDate: data.dueDate as string | undefined };
  } catch { return null; }
}

function parseRecordatorio(note: { id: string; content: string; createdAt: string }) {
  try {
    const data = JSON.parse(note.content.replace("[RECORDATORIO] ", ""));
    return { id: note.id, title: data.title as string, dueAt: data.dueAt as string };
  } catch { return null; }
}

function LeadPanel({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const { leads, addNote, updateNote, deleteNote, updateLeadStage, deleteLead, properties, addLeadProperty, removeLeadProperty } = useAppStore();
  const { user } = useAuthStore();
  const lead = leads.find((l) => l.id === leadId) ?? null;
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [firmaOpen, setFirmaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"actividad" | "tareas" | "recordatorios">("actividad");
  // Task form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  // Reminder form
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");
  // Properties
  const [propSearch, setPropSearch] = useState("");
  const [addingProp, setAddingProp] = useState(false);

  if (!lead) return null;

  const ui = toUILead(lead);
  const phone = (lead.phone ?? "").replace(/\D/g, "").slice(-10);
  const matchedProperty = properties.find((p) => lead.interestedProperties?.some((ip) => ip.id === p.id));
  const interestedProps = lead.interestedProperties ?? [];
  const waTemplates = WA_TEMPLATES[lead.stage] ?? [];

  const openWa = (message: string) => {
    const url = `https://wa.me/54${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noreferrer");
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Mensaje copiado"));
  };

  const handleNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      await addNote(lead.id, noteText.trim());
      setNoteText("");
      toast.success("Nota agregada");
    } catch { toast.error("No se pudo agregar la nota"); }
    finally { setSaving(false); }
  };

  const handleStage = async (stage: Stage) => {
    try {
      await updateLeadStage(lead.id, stage);
      toast.success(`Etapa actualizada a "${STAGE_LABELS[stage]}"`);
    } catch { toast.error("No se pudo actualizar la etapa"); }
  };

  const handleDelete = async () => {
    try {
      await deleteLead(lead.id);
      toast.success("Lead eliminado");
      onClose();
    } catch { toast.error("No se pudo eliminar el lead"); }
  };

  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-lg">{lead.name}</SheetTitle>
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={ui.stage} />
            <StatusBadge status={ui.source} className="bg-muted text-muted-foreground" />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact */}
          <div className="space-y-2 text-sm">
            {lead.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 shrink-0" /><span className="break-all">{lead.email}</span></div>}
            {lead.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 shrink-0" />{lead.phone}</div>}
            {matchedProperty && <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4 shrink-0" /><span className="truncate">{matchedProperty.title}</span></div>}
            <p className="text-muted-foreground">Presupuesto: <span className="font-semibold text-foreground">{ui.budget}</span></p>
          </div>

          {/* Propiedades de interés */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Propiedades de interés</h3>
              <button
                onClick={() => setAddingProp((v) => !v)}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Plus className="h-3 w-3" />{addingProp ? "Cancelar" : "Agregar"}
              </button>
            </div>

            {/* Search to add */}
            {addingProp && (
              <div className="space-y-1">
                <Input
                  placeholder="Buscar propiedad..."
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                  className="text-xs h-8"
                  autoFocus
                />
                {propSearch.trim() && (
                  <div className="rounded-lg border bg-background shadow-md max-h-40 overflow-y-auto">
                    {properties
                      .filter((p) =>
                        !interestedProps.some((ip) => ip.id === p.id) &&
                        (p.title.toLowerCase().includes(propSearch.toLowerCase()) ||
                         p.address.toLowerCase().includes(propSearch.toLowerCase()))
                      )
                      .slice(0, 6)
                      .map((p) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 border-b last:border-0 flex items-center gap-2"
                          onClick={async () => {
                            await addLeadProperty(lead.id, p.id);
                            setPropSearch("");
                            setAddingProp(false);
                          }}
                        >
                          {p.photos[0] && <img src={p.photos[0]} className="h-8 w-10 object-cover rounded shrink-0" alt="" />}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.title}</p>
                            <p className="text-muted-foreground truncate">{p.address}</p>
                          </div>
                        </button>
                      ))}
                    {properties.filter((p) =>
                      !interestedProps.some((ip) => ip.id === p.id) &&
                      (p.title.toLowerCase().includes(propSearch.toLowerCase()) || p.address.toLowerCase().includes(propSearch.toLowerCase()))
                    ).length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Property list */}
            {interestedProps.length === 0 && !addingProp && (
              <p className="text-xs text-muted-foreground italic">Sin propiedades asignadas.</p>
            )}
            <div className="space-y-1.5">
              {interestedProps.map((ip) => {
                const full = properties.find((p) => p.id === ip.id);
                return (
                  <div key={ip.id} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                    {full?.photos?.[0] && (
                      <img src={full.photos[0]} className="h-10 w-14 object-cover rounded shrink-0" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ip.title}</p>
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                        ip.status === "DISPONIBLE" ? "bg-green-100 text-green-700"
                        : ip.status === "RESERVADO" ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                      }`}>{ip.status}</span>
                    </div>
                    <button
                      onClick={() => removeLeadProperty(lead.id, ip.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage */}
          <div className="space-y-1.5">
            <Label>Etapa del pipeline</Label>
            <Select value={lead.stage} onValueChange={(v) => handleStage(v as Stage)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {lead.email && (
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`mailto:${lead.email}`}><Mail className="mr-1.5 h-3.5 w-3.5" />Email</a>
              </Button>
            )}
            {/* WhatsApp with template picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="flex-1 bg-green-600 text-white hover:bg-green-700 gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />WhatsApp<ChevronDown className="h-3 w-3 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2 space-y-1" align="start">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">
                  Plantillas para "{STAGE_LABELS[lead.stage]}"
                </p>
                {waTemplates.map((tpl) => {
                  const msg = tpl.message(lead.name, matchedProperty?.title);
                  return (
                    <div key={tpl.label} className="rounded-md border bg-muted/30 p-2 space-y-1">
                      <p className="text-xs font-medium">{tpl.label}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{msg}</p>
                      <div className="flex gap-1.5 pt-0.5">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" onClick={() => copyText(msg)}>
                          <Copy className="h-2.5 w-2.5" />Copiar
                        </Button>
                        {phone && (
                          <Button size="sm" className="h-6 text-[10px] gap-1 flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => openWa(msg)}>
                            <MessageCircle className="h-2.5 w-2.5" />Abrir WA
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!phone && (
                  <p className="text-[11px] text-muted-foreground px-2 py-1">Sin número de teléfono</p>
                )}
              </PopoverContent>
            </Popover>

            {/* Firma digital */}
            <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setFirmaOpen(true)}>
              <FileSignature className="h-3.5 w-3.5" />Firma digital
            </Button>
          </div>

          <FirmaDigital
            open={firmaOpen}
            onClose={() => setFirmaOpen(false)}
            leadName={lead.name}
            propertyTitle={matchedProperty?.title ?? "Propiedad"}
            propertyAddress={matchedProperty?.address}
            agentName={user?.name ?? "Agente"}
          />

          {/* Tabs: Actividad | Tareas | Recordatorios */}
          <div className="space-y-3">
            <div className="flex rounded-lg bg-muted p-1 gap-1">
              {(["actividad", "tareas", "recordatorios"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors capitalize ${activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab === "actividad" ? "Actividad" : tab === "tareas" ? "Tareas" : "Recordatorios"}
                </button>
              ))}
            </div>

            {/* Actividad tab */}
            {activeTab === "actividad" && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {[...(lead.notes ?? [])]
                    .filter((n) => !n.content.startsWith("[TAREA]") && !n.content.startsWith("[RECORDATORIO]"))
                    .reverse()
                    .map((note, i) => {
                      const isActivity = note.content.startsWith("[ACTIVIDAD]") || note.content.startsWith("[PRECIO]");
                      const content = note.content.replace(/^\[(ACTIVIDAD|PRECIO)\] /, "");
                      const date = note.createdAt?.split("T")[0] ?? "";
                      const Icon = isActivity
                        ? content.includes("Visita") ? CalendarDays : GitCommitHorizontal
                        : null;
                      return (
                        <div key={i} className={`relative flex gap-2.5 ${isActivity ? "items-start" : "pl-4 border-l-2 border-accent/40"}`}>
                          {isActivity && Icon && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border shrink-0 mt-0.5">
                              <Icon className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground">{date}</p>
                            <p className={`text-xs ${isActivity ? "text-muted-foreground italic" : "text-sm text-foreground"}`}>{content}</p>
                          </div>
                        </div>
                      );
                    })}
                  {(!lead.notes?.filter((n) => !n.content.startsWith("[TAREA]") && !n.content.startsWith("[RECORDATORIO]")).length) && (
                    <p className="text-xs text-muted-foreground italic">Sin actividad aún.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Agregar una nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleNote()} className="text-sm" />
                  <Button size="icon" variant="outline" onClick={handleNote} disabled={!noteText.trim() || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Tareas tab */}
            {activeTab === "tareas" && (() => {
              const tareas = (lead.notes ?? [])
                .filter((n) => n.content.startsWith("[TAREA]"))
                .map(parseTarea)
                .filter(Boolean) as NonNullable<ReturnType<typeof parseTarea>>[];

              const addTask = async () => {
                if (!taskTitle.trim()) return;
                setSaving(true);
                try {
                  await addNote(lead.id, `[TAREA] ${JSON.stringify({ title: taskTitle.trim(), done: false, dueDate: taskDue || undefined })}`);
                  setTaskTitle(""); setTaskDue("");
                } catch { toast.error("No se pudo agregar la tarea"); }
                finally { setSaving(false); }
              };

              const toggleDone = async (t: NonNullable<ReturnType<typeof parseTarea>>) => {
                await updateNote(lead.id, t.id, `[TAREA] ${JSON.stringify({ title: t.title, done: !t.done, dueDate: t.dueDate })}`);
              };

              const removeTask = async (id: string) => {
                await deleteNote(lead.id, id);
              };

              const pending = tareas.filter((t) => !t.done);
              const done = tareas.filter((t) => t.done);
              const today = new Date().toISOString().split("T")[0];

              return (
                <div className="space-y-3">
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {pending.length === 0 && done.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Sin tareas pendientes.</p>
                    )}
                    {pending.map((t) => (
                      <div key={t.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${t.dueDate && t.dueDate < today ? "border-red-200 bg-red-50" : "bg-muted/30"}`}>
                        <button onClick={() => toggleDone(t)} className="shrink-0 text-muted-foreground hover:text-primary">
                          <Square className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{t.title}</p>
                          {t.dueDate && <p className={`text-[10px] ${t.dueDate < today ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>Vence: {t.dueDate}</p>}
                        </div>
                        <button onClick={() => removeTask(t.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    {done.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/20 opacity-60">
                        <button onClick={() => toggleDone(t)} className="shrink-0 text-green-600"><CheckSquare className="h-4 w-4" /></button>
                        <p className="text-xs line-through text-muted-foreground flex-1 truncate">{t.title}</p>
                        <button onClick={() => removeTask(t.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <Input placeholder="Nueva tarea..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="text-sm" />
                    <div className="flex gap-2">
                      <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                      <Button size="sm" onClick={addTask} disabled={!taskTitle.trim() || saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recordatorios tab */}
            {activeTab === "recordatorios" && (() => {
              const reminders = (lead.notes ?? [])
                .filter((n) => n.content.startsWith("[RECORDATORIO]"))
                .map(parseRecordatorio)
                .filter(Boolean) as NonNullable<ReturnType<typeof parseRecordatorio>>[];

              const addReminder = async () => {
                if (!remTitle.trim() || !remDate) return;
                setSaving(true);
                try {
                  await addNote(lead.id, `[RECORDATORIO] ${JSON.stringify({ title: remTitle.trim(), dueAt: remDate })}`);
                  setRemTitle(""); setRemDate("");
                } catch { toast.error("No se pudo agregar el recordatorio"); }
                finally { setSaving(false); }
              };

              const removeReminder = async (id: string) => { await deleteNote(lead.id, id); };
              const today = new Date().toISOString().split("T")[0];
              const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

              return (
                <div className="space-y-3">
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {reminders.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Sin recordatorios.</p>
                    )}
                    {[...reminders].sort((a, b) => a.dueAt.localeCompare(b.dueAt)).map((r) => {
                      const isToday = r.dueAt === today;
                      const isTomorrow = r.dueAt === tomorrow;
                      const isPast = r.dueAt < today;
                      return (
                        <div key={r.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${isPast ? "border-red-200 bg-red-50" : isToday ? "border-amber-200 bg-amber-50" : "bg-muted/30"}`}>
                          <AlarmClock className={`h-4 w-4 shrink-0 ${isPast ? "text-red-500" : isToday ? "text-amber-600" : "text-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{r.title}</p>
                            <p className={`text-[10px] ${isPast ? "text-red-500 font-semibold" : isToday ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}>
                              {isPast ? "Vencido · " : isToday ? "Hoy · " : isTomorrow ? "Mañana · " : ""}{r.dueAt}
                            </p>
                          </div>
                          <button onClick={() => removeReminder(r.id)} className="shrink-0 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <Input placeholder="¿Qué recordar?" value={remTitle} onChange={(e) => setRemTitle(e.target.value)} className="text-sm" />
                    <div className="flex gap-2">
                      <input type="date" value={remDate} onChange={(e) => setRemDate(e.target.value)} className="flex-1 rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                      <Button size="sm" onClick={addReminder} disabled={!remTitle.trim() || !remDate || saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Delete */}
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />Eliminar lead
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Create lead dialog ───────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", email: "", phone: "", budget: "", source: "WEB", propertyId: "", stage: "NUEVO" as Stage };

function CreateLeadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addLead, properties } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (f: string, v: string) => setForm((x) => ({ ...x, [f]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addLead({
        name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        source: form.source as ApiLead["source"], stage: form.stage,
        propertyIds: form.propertyId ? [form.propertyId] : [],
      } as never);
      toast.success(`Lead "${form.name}" creado`);
      setForm({ name: "", email: "", phone: "", budget: "", source: "WEB", propertyId: "", stage: "NUEVO" });
      onClose();
    } catch { toast.error("No se pudo crear el lead"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else setForm(EMPTY_FORM); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuevo Lead</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nombre *</Label><Input placeholder="Nombre completo" value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1" /></div>
            <div><Label>Email</Label><Input type="email" placeholder="email@..." value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1" /></div>
            <div><Label>Teléfono</Label><Input placeholder="+54 11 ..." value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1" /></div>
            <div><Label>Presupuesto (ARS)</Label><Input type="number" placeholder="200000000" value={form.budget} onChange={(e) => set("budget", e.target.value)} className="mt-1" /></div>
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
            <div className="col-span-2">
              <Label>Propiedad de interés</Label>
              <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Etapa inicial</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-primary text-primary-foreground" onClick={handleSubmit} disabled={!form.name.trim() || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Crear Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { leads, updateLeadStage, leadsLoading, leadsTotal, loadMoreLeads, fetchLeads } = useAppStore();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();

  // Auto-open lead panel when navigating from Activity feed
  useEffect(() => {
    const openLeadId = (location.state as { openLeadId?: string } | null)?.openLeadId;
    if (openLeadId) {
      setSelectedLeadId(openLeadId);
      // Clear state so it doesn't reopen on future renders
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filteredLeads = search.trim()
    ? leads.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").includes(q)
        );
      })
    : leads;

  const getLeadsByStage = (stage: Stage) => filteredLeads.filter((l) => l.stage === stage);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const newStage = over.id as Stage;
    const lead = leads.find((l) => l.id === active.id);
    if (lead && lead.stage !== newStage && STAGES.includes(newStage)) {
      try {
        await updateLeadStage(lead.id, newStage);
        toast.success(`"${lead.name}" → ${STAGE_LABELS[newStage]}`);
      } catch { toast.error("No se pudo mover el lead"); }
    }
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads (CRM)</h1>
          <p className="text-sm text-muted-foreground">Pipeline de ventas · {leads.length}{leadsTotal > leads.length ? ` de ${leadsTotal}` : ""} leads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead..."
              className="pl-9 w-48"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />Importar CSV
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Nuevo Lead
          </Button>
        </div>
      </div>

      {leadsLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-6 px-6">
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {STAGES.map((stage) => (
              <KanbanColumn key={stage} stage={stage} leads={getLeadsByStage(stage)} onLeadClick={(l) => setSelectedLeadId(l.id)} activeId={activeId} />
            ))}
            <DragOverlay>
              {activeLead && (
                <div className={`w-[260px] rounded-lg border border-t-2 ${stageTopColor[activeLead.stage]} bg-card p-3 shadow-xl`}>
                  <p className="text-sm font-medium text-foreground">{activeLead.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{toUILead(activeLead).budget}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Load more */}
      {leads.length < leadsTotal && !search && (
        <div className="flex justify-center pt-1 shrink-0">
          <Button variant="outline" size="sm" onClick={loadMoreLeads} disabled={leadsLoading}>
            {leadsLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            Cargar más leads ({leads.length} de {leadsTotal})
          </Button>
        </div>
      )}

      <LeadPanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportLeadsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchLeads({ limit: 100, page: 1 })}
      />
    </div>
  );
}
