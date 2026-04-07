import { useState, useEffect, useRef } from "react";
import { useAppStore, toUIProperty } from "@/store/useAppStore";
import { ApiProperty } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, LayoutGrid, List, BedDouble, Bath, Maximize2, Search, MapPin, Pencil, Trash2, X, ChevronLeft, ChevronRight, Loader2, ImagePlus, XCircle, FileText, Share2, TrendingDown, TrendingUp, Calculator, Map, RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { generatePropertySheet } from "@/components/PropertySheet";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { PropertyMap } from "@/components/PropertyMap";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuthStore } from "@/store/useAuthStore";
import { propertiesApi, portalsApi, ApiPortalSync } from "@/lib/api";

const AMENITY_OPTIONS = [
  "Patio","Terraza","Parrilla","Cochera","Pileta","Jardín","Balcón","SUM",
  "Gym","Sauna","Seguridad 24hs","Aire acondicionado","Laundry","Sin expensas","Vidriera","Depósito",
];

function formatPrice(price: string | number, currency: string): string {
  const n = Number(price);
  if (currency === "USD") return `USD ${(n / 1000).toFixed(0)}k`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString("es-AR")}`;
}

function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const list = photos.length ? photos : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop"];
  return (
    <div className="relative rounded-xl overflow-hidden h-64 bg-muted">
      <img src={list[idx]} alt={title} className="w-full h-full object-cover" />
      {list.length > 1 && (
        <>
          <button onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setIdx((i) => (i + 1) % list.length)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
        </>
      )}
    </div>
  );
}

const PORTAL_LABELS: Record<string, string> = {
  ZONAPROP: "Zonaprop", ARGENPROP: "Argenprop",
  MERCADOINMUEBLE: "MercadoInmueble", PROPERATI: "Properati",
};

function PortalSyncSection({ propertyId }: { propertyId: string }) {
  const [syncs, setSyncs] = useState<ApiPortalSync[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    portalsApi.getSyncStatus(propertyId).then(setSyncs).catch(() => {});
  }, [propertyId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await portalsApi.triggerSync(propertyId);
      // Poll every 2s for up to 30s
      let tries = 0;
      const poll = setInterval(async () => {
        tries++;
        const status = await portalsApi.getSyncStatus(propertyId).catch(() => []);
        setSyncs(status);
        const allDone = status.every((s) => s.status === "SUCCESS" || s.status === "ERROR");
        if (allDone || tries >= 15) {
          clearInterval(poll);
          setSyncing(false);
        }
      }, 2000);
    } catch {
      toast.error("No se pudo iniciar la sincronización");
      setSyncing(false);
    }
  };

  const statusIcon = (s: ApiPortalSync["status"]) => {
    if (s === "SUCCESS") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (s === "ERROR") return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (s === "SYNCING") return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const statusLabel = (s: ApiPortalSync["status"]) =>
    ({ SUCCESS: "Publicado", ERROR: "Error", SYNCING: "Sincronizando...", PENDING: "Pendiente" })[s] ?? s;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Publicar en portales</p>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-7 text-xs gap-1.5">
          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar todos"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["ZONAPROP", "ARGENPROP", "MERCADOINMUEBLE", "PROPERATI"].map((portal) => {
          const sync = syncs.find((s) => s.portal === portal);
          return (
            <div key={portal} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${sync?.status === "SUCCESS" ? "border-green-200 bg-green-50" : sync?.status === "ERROR" ? "border-red-200 bg-red-50" : "bg-muted/30"}`}>
              {statusIcon(sync?.status ?? "PENDING")}
              <div className="min-w-0">
                <p className="text-xs font-medium">{PORTAL_LABELS[portal]}</p>
                <p className="text-[10px] text-muted-foreground">
                  {sync ? statusLabel(sync.status) : "No sincronizado"}
                  {sync?.lastSyncedAt && ` · ${new Date(sync.lastSyncedAt).toLocaleDateString("es-AR")}`}
                </p>
                {sync?.errorMessage && <p className="text-[10px] text-red-500 truncate">{sync.errorMessage}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PropertyDetailModal({ property, onClose, onEdit }: { property: ApiProperty | null; onClose: () => void; onEdit: (p: ApiProperty) => void }) {
  const { user } = useAuthStore();
  const [calcOpen, setCalcOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<{ content: string; createdAt: string }[]>([]);

  // Lazy-load price history when modal opens
  useState(() => {
    if (!property) return;
    propertiesApi.get(property.id).then((p) => {
      const notes = (p as never as { notes?: { content: string; createdAt: string }[] }).notes ?? [];
      setPriceHistory(notes.filter((n) => n.content.startsWith("[PRECIO]")).reverse());
    }).catch(() => {});
  });

  if (!property) return null;
  const ui = toUIProperty(property);

  return (
    <>
      <Dialog open={!!property} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-xl">{property.title}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <PhotoGallery photos={property.photos} title={property.title} />
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-2xl font-bold text-accent">{formatPrice(property.price, property.currency)}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1"><MapPin className="h-3.5 w-3.5" />{property.address}</div>
              </div>
              <QuickStatusBadge property={property} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[{ Icon: BedDouble, val: property.rooms, label: "ambientes" }, { Icon: Bath, val: property.bathrooms, label: "baños" }, { Icon: Maximize2, val: `${ui.area}`, label: "m²" }].map(({ Icon, val, label }) => (
                <div key={label} className="rounded-lg bg-muted/60 p-3 text-center">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {property.description && <div><p className="text-sm font-semibold mb-1">Descripción</p><p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p></div>}
            {property.amenities.length > 0 && (
              <div><p className="text-sm font-semibold mb-2">Amenidades</p><div className="flex flex-wrap gap-2">{property.amenities.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}</div></div>
            )}

            {/* Price history */}
            {priceHistory.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Historial de precios</p>
                <div className="space-y-1.5">
                  {priceHistory.map((n, i) => {
                    const text = n.content.replace("[PRECIO] ", "");
                    const isDown = text.startsWith("↓");
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {isDown
                          ? <TrendingDown className="h-3.5 w-3.5 text-green-600 shrink-0" />
                          : <TrendingUp className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <span className={isDown ? "text-green-700" : "text-red-600"}>{text}</span>
                        <span className="text-muted-foreground ml-auto">{n.createdAt.split("T")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <PortalSyncSection propertyId={property.id} />

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="flex-1" onClick={() => { onClose(); onEdit(property); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
              <Button variant="outline" className="flex-1" onClick={() => generatePropertySheet(property, user?.name ?? "Agente")}><FileText className="mr-2 h-4 w-4" />Ficha PDF</Button>
              <Button variant="outline" className="flex-1" onClick={() => setCalcOpen(true)}><Calculator className="mr-2 h-4 w-4" />Calculadora</Button>
              <Button variant="outline" className="w-full gap-2" onClick={() => {
                const url = `${window.location.origin}/p/${property.id}`;
                navigator.clipboard.writeText(url).then(() => toast.success("Link copiado al portapapeles"));
              }}><Share2 className="h-4 w-4" />Compartir link público</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MortgageCalculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        defaultPrice={Number(property.price)}
        currency={property.currency}
      />
    </>
  );
}

function PhotoUploader({
  existingPhotos,
  newFiles,
  onAddFiles,
  onRemoveExisting,
  onRemoveNew,
}: {
  existingPhotos: string[];
  newFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (url: string) => void;
  onRemoveNew: (index: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useState<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) onAddFiles(imgs);
  };

  const newPreviews = newFiles.map((f) => URL.createObjectURL(f));

  return (
    <div className="space-y-3">
      <Label>Fotos</Label>

      {/* Existing + new thumbnails */}
      {(existingPhotos.length > 0 || newFiles.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {existingPhotos.map((url) => (
            <div key={url} className="relative group">
              <img src={url} alt="" className="h-20 w-28 object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => onRemoveExisting(url)}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {newFiles.map((_, i) => (
            <div key={i} className="relative group">
              <img src={newPreviews[i]} alt="" className="h-20 w-28 object-cover rounded-lg border-2 border-primary/40" />
              <button
                type="button"
                onClick={() => onRemoveNew(i)}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
              <span className="absolute bottom-1 left-1 text-[9px] bg-primary text-white rounded px-1">nueva</span>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <label
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors p-6 ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <ImagePlus className="h-7 w-7 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Arrastrá fotos o hacé click</p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP hasta 10MB c/u</p>
        </div>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}

function PropertyDrawer({ open, property, onClose }: { open: boolean; property: ApiProperty | null; onClose: () => void }) {
  const { addProperty, updateProperty, deleteProperty } = useAppStore();
  const isEdit = !!property;
  const [saving, setSaving] = useState(false);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);

  const [form, setForm] = useState(() => property ? {
    title: property.title, address: property.address, neighborhood: property.neighborhood,
    price: String(Number(property.price)), type: property.type, status: property.status,
    rooms: String(property.rooms), bathrooms: String(property.bathrooms),
    area: String(Number(property.area)), description: property.description ?? "", amenities: [...property.amenities],
  } : { title: "", address: "", neighborhood: "", price: "", type: "DEPTO", status: "DISPONIBLE", rooms: "", bathrooms: "", area: "", description: "", amenities: [] as string[] });

  // Reset photo state when drawer opens/closes
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setNewPhotoFiles([]);
      setRemovedPhotos([]);
      onClose();
    }
  };

  const set = (f: string, v: string | string[]) => setForm((x) => ({ ...x, [f]: v }));
  const toggleAmenity = (a: string) => set("amenities", form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a]);

  const existingPhotos = (property?.photos ?? []).filter((url) => !removedPhotos.includes(url));

  const handleSave = async () => {
    if (!form.title.trim() || !form.price) return;
    setSaving(true);
    try {
      const data = {
        title: form.title, address: form.address, neighborhood: form.neighborhood,
        price: Number(form.price) as never, type: form.type as ApiProperty["type"],
        status: form.status as ApiProperty["status"], rooms: Number(form.rooms) || 1,
        bathrooms: Number(form.bathrooms) || 1, area: Number(form.area) || 0 as never,
        description: form.description || undefined, amenities: form.amenities,
        // Pass kept photos when editing so the backend can update the list
        ...(isEdit && { photos: existingPhotos }),
      };
      if (isEdit && property) {
        await updateProperty(property.id, data);
        // Upload any new photos via the add-photos endpoint
        if (newPhotoFiles.length) {
          const fd = new FormData();
          newPhotoFiles.forEach((f) => fd.append("photos", f));
          const { propertiesApi } = await import("@/lib/api");
          const { photos } = await propertiesApi.addPhotos(property.id, newPhotoFiles);
          await updateProperty(property.id, { photos } as never);
        }
        toast.success("Propiedad actualizada");
      } else {
        await addProperty(data, newPhotoFiles.length ? newPhotoFiles : undefined);
        toast.success("Propiedad creada");
      }
      handleOpenChange(false);
    } catch { toast.error("No se pudo guardar la propiedad"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!property) return;
    setSaving(true);
    try { await deleteProperty(property.id); toast.success("Propiedad eliminada"); handleOpenChange(false); }
    catch { toast.error("No se pudo eliminar"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader><SheetTitle>{isEdit ? "Editar Propiedad" : "Nueva Propiedad"}</SheetTitle></SheetHeader>
        <div className="mt-6 space-y-4">
          {/* Photo uploader */}
          <PhotoUploader
            existingPhotos={existingPhotos}
            newFiles={newPhotoFiles}
            onAddFiles={(files) => setNewPhotoFiles((prev) => [...prev, ...files])}
            onRemoveExisting={(url) => setRemovedPhotos((prev) => [...prev, url])}
            onRemoveNew={(i) => setNewPhotoFiles((prev) => prev.filter((_, idx) => idx !== i))}
          />

          <div><Label>Título *</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1" /></div>
          <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} className="mt-1" /></div>
          <div><Label>Barrio</Label><Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["CASA","DEPTO","OFICINA","PH","LOCAL","TERRENO"] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["DISPONIBLE","RESERVADO","VENDIDO","ALQUILADO"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Precio (ARS)</Label><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className="mt-1" /></div>
            <div><Label>Superficie (m²)</Label><Input type="number" value={form.area} onChange={(e) => set("area", e.target.value)} className="mt-1" /></div>
            <div><Label>Ambientes</Label><Input type="number" value={form.rooms} onChange={(e) => set("rooms", e.target.value)} className="mt-1" /></div>
            <div><Label>Baños</Label><Input type="number" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label>Descripción</Label><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div>
            <Label className="mb-2 block">Amenidades</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${form.amenities.includes(a) ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground hover:border-accent/60"}`}>{a}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {isEdit && <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={saving}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>}
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSave} disabled={!form.title.trim() || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Guardar cambios" : "Crear propiedad"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const STATUSES: { value: ApiProperty["status"]; label: string; dot: string; pill: string }[] = [
  { value: "DISPONIBLE", label: "Disponible", dot: "bg-green-500",  pill: "bg-green-100 text-green-800" },
  { value: "RESERVADO",  label: "Reservado",  dot: "bg-amber-500", pill: "bg-amber-100 text-amber-800" },
  { value: "ALQUILADO",  label: "Alquilado",  dot: "bg-blue-500",  pill: "bg-blue-100 text-blue-800" },
  { value: "VENDIDO",    label: "Vendido",    dot: "bg-zinc-400",  pill: "bg-zinc-100 text-zinc-700" },
];

function QuickStatusBadge({ property }: { property: ApiProperty }) {
  const { updateProperty } = useAppStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = STATUSES.find((s) => s.value === property.status) ?? STATUSES[0];

  const handleChange = async (status: ApiProperty["status"], e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === property.status) { setOpen(false); return; }
    setSaving(true);
    try {
      await updateProperty(property.id, { status });
    } catch { toast.error("No se pudo cambiar el estado"); }
    finally { setSaving(false); setOpen(false); }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all shadow-sm border border-white/30
            ${current.pill} ${saving ? "opacity-60" : "hover:brightness-95 active:scale-95"}`}
        >
          {saving
            ? <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            : <span className={`h-2 w-2 rounded-full shrink-0 ${current.dot}`} />
          }
          {current.label}
          <ChevronDown className={`h-3 w-3 shrink-0 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1.5 shadow-xl"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        {STATUSES.map((s) => {
          const isActive = property.status === s.value;
          return (
            <button
              key={s.value}
              onClick={(e) => handleChange(s.value, e)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
                ${isActive ? "bg-muted/70" : "hover:bg-muted/50"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />
              <span className="flex-1 text-left font-medium">{s.label}</span>
              {isActive && <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export default function PropertiesPage() {
  const { properties, propertiesLoading, propertiesTotal, propertiesPage, propertiesTotalPages, fetchProperties } = useAppStore();
  const [view, setView] = useState<"grid" | "list" | "map">("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [detailProperty, setDetailProperty] = useState<ApiProperty | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<ApiProperty | null>(null);

  const STATUS_LABEL: Record<string, string> = { DISPONIBLE: "Disponible", RESERVADO: "Reservado", VENDIDO: "Vendido", ALQUILADO: "Alquilado" };

  // Debounce search
  const searchTimer = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer[0]) clearTimeout(searchTimer[0]);
    searchTimer[1](setTimeout(() => setSearchDebounced(val), 400));
  };

  // Refetch when filters or page context changes
  const refetch = (page = 1) => {
    const params: Record<string, string | number> = { page, limit: view === "list" ? 20 : 12 };
    if (statusFilter !== "all") params.status = statusFilter;
    if (typeFilter !== "all") params.type = typeFilter;
    if (searchDebounced.trim()) params.search = searchDebounced.trim();
    fetchProperties(params);
  };

  // Re-fetch when filters or debounced search change
  useEffect(() => { refetch(1); }, [statusFilter, typeFilter, searchDebounced, view]);

  const openEdit = (p: ApiProperty) => { setEditProperty(p); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Propiedades</h1><p className="text-sm text-muted-foreground">{propertiesTotal} propiedades en total</p></div>
        <Button className="bg-primary text-primary-foreground" onClick={() => { setEditProperty(null); setDrawerOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva Propiedad</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
          {search && <button onClick={() => { handleSearch(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {["DISPONIBLE","RESERVADO","VENDIDO","ALQUILADO"].map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {["CASA","DEPTO","OFICINA","PH","LOCAL","TERRENO"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <Button variant={view === "grid" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-none" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === "list" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-none" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
          <Button variant={view === "map" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-none" onClick={() => setView("map")}><Map className="h-4 w-4" /></Button>
        </div>
      </div>

      {propertiesLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : view === "map" ? (
        <PropertyMap properties={properties} onSelectProperty={setDetailProperty} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {properties.map((p) => {
            const ui = toUIProperty(p);
            return (
              <div key={p.id} className="rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setDetailProperty(p)}>
                <div className="relative h-40 overflow-hidden">
                  <img src={ui.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2 left-2"><QuickStatusBadge property={p} /></div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="h-7 w-7 rounded-full bg-white/90 flex items-center justify-center shadow text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  <p className="text-lg font-bold text-accent">{formatPrice(p.price, p.currency)}</p>
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{p.address}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.rooms}</span>
                    <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms}</span>
                    <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{ui.area}m²</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground bg-muted/20">
              <th className="px-5 py-3 font-medium">Propiedad</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Precio</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Detalles</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {properties.map((p) => {
                const ui = toUIProperty(p);
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDetailProperty(p)}>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={ui.image} alt={p.title} className="h-10 w-14 rounded object-cover shrink-0" /><div className="min-w-0"><p className="font-medium truncate">{p.title}</p><p className="text-xs text-muted-foreground truncate">{p.address}</p></div></div></td>
                    <td className="px-5 py-3 text-muted-foreground">{p.type}</td>
                    <td className="px-5 py-3 font-semibold text-accent">{formatPrice(p.price, p.currency)}</td>
                    <td className="px-5 py-3"><QuickStatusBadge property={p} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{p.rooms}amb · {p.bathrooms}ba · {ui.area}m²</td>
                    <td className="px-5 py-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {properties.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron propiedades.</div>}
        </div>
      )}

      {/* Pagination controls */}
      {propertiesTotalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Página {propertiesPage} de {propertiesTotalPages} · {propertiesTotal} propiedades
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={propertiesPage <= 1 || propertiesLoading}
              onClick={() => refetch(propertiesPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={propertiesPage >= propertiesTotalPages || propertiesLoading}
              onClick={() => refetch(propertiesPage + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <PropertyDetailModal property={detailProperty} onClose={() => setDetailProperty(null)} onEdit={openEdit} />
      <PropertyDrawer open={drawerOpen} property={editProperty} onClose={() => { setDrawerOpen(false); setEditProperty(null); }} />
    </div>
  );
}
