import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { useAppStore, toUILead } from "@/store/useAppStore";
import { ApiLead } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Phone, MessageCircle, Building2, Plus, Send, Trash2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

// ─── Lead detail panel ────────────────────────────────────────────────────────

function LeadPanel({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const { leads, addNote, updateLeadStage, deleteLead, properties } = useAppStore();
  const lead = leads.find((l) => l.id === leadId) ?? null;
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const ui = toUILead(lead);
  const waLink = `https://wa.me/54${(lead.phone ?? "").replace(/\D/g, "").slice(-10)}?text=Hola%20${encodeURIComponent(lead.name)}%2C%20te%20contacto%20desde%20InmoGestión`;
  const matchedProperty = properties.find((p) => lead.interestedProperties?.some((ip) => ip.id === p.id));

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

          {/* Property thumbnail */}
          {matchedProperty?.photos?.[0] && (
            <div className="rounded-lg border overflow-hidden">
              <img src={matchedProperty.photos[0]} alt={matchedProperty.title} className="w-full h-28 object-cover" />
              <div className="p-3"><p className="text-xs font-medium text-foreground">{matchedProperty.title}</p></div>
            </div>
          )}

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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</Button>
            <Button size="sm" className="flex-1 bg-green-600 text-white hover:bg-green-700" asChild>
              <a href={waLink} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</a>
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Historial de notas</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {[...(lead.notes ?? [])].reverse().map((note, i) => (
                <div key={i} className="relative pl-4 border-l-2 border-accent/40">
                  <p className="text-[11px] text-muted-foreground">{note.createdAt?.split("T")[0] ?? note.id}</p>
                  <p className="text-sm text-foreground">{note.content}</p>
                </div>
              ))}
              {(!lead.notes?.length) && <p className="text-xs text-muted-foreground italic">Sin notas aún.</p>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Agregar una nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleNote()} className="text-sm" />
              <Button size="icon" variant="outline" onClick={handleNote} disabled={!noteText.trim() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
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
  const { leads, updateLeadStage, leadsLoading } = useAppStore();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const getLeadsByStage = (stage: Stage) => leads.filter((l) => l.stage === stage);

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
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads (CRM)</h1>
          <p className="text-sm text-muted-foreground">Pipeline de ventas · {leads.length} leads totales</p>
        </div>
        <Button className="bg-primary text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Nuevo Lead
        </Button>
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

      <LeadPanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
