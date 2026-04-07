import { useState } from "react";
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
import { Plus, LayoutGrid, List, BedDouble, Bath, Maximize2, Search, MapPin, Pencil, Trash2, X, ChevronLeft, ChevronRight, Loader2, ImagePlus, XCircle, FileText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { generatePropertySheet } from "@/components/PropertySheet";
import { useAuthStore } from "@/store/useAuthStore";

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

function PropertyDetailModal({ property, onClose, onEdit }: { property: ApiProperty | null; onClose: () => void; onEdit: (p: ApiProperty) => void }) {
  const { user } = useAuthStore();
  if (!property) return null;
  const ui = toUIProperty(property);
  return (
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
            <StatusBadge status={ui.status} />
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="flex-1" onClick={() => { onClose(); onEdit(property); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
            <Button variant="outline" className="flex-1" onClick={() => generatePropertySheet(property, user?.name ?? "Agente")}><FileText className="mr-2 h-4 w-4" />Ficha PDF</Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => {
              const url = `${window.location.origin}/p/${property.id}`;
              navigator.clipboard.writeText(url).then(() => toast.success("Link copiado al portapapeles"));
            }}><Share2 className="h-4 w-4" />Compartir link público</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

export default function PropertiesPage() {
  const { properties, propertiesLoading } = useAppStore();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailProperty, setDetailProperty] = useState<ApiProperty | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<ApiProperty | null>(null);

  const STATUS_LABEL: Record<string, string> = { DISPONIBLE: "Disponible", RESERVADO: "Reservado", VENDIDO: "Vendido", ALQUILADO: "Alquilado" };

  const filtered = properties.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (search && ![p.title, p.address, p.neighborhood].some((s) => s.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const openEdit = (p: ApiProperty) => { setEditProperty(p); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Propiedades</h1><p className="text-sm text-muted-foreground">{filtered.length} propiedades encontradas</p></div>
        <Button className="bg-primary text-primary-foreground" onClick={() => { setEditProperty(null); setDrawerOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva Propiedad</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>}
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
        </div>
      </div>

      {propertiesLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const ui = toUIProperty(p);
            return (
              <div key={p.id} className="rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setDetailProperty(p)}>
                <div className="relative h-40 overflow-hidden">
                  <img src={ui.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2 left-2"><StatusBadge status={ui.status} /></div>
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
              {filtered.map((p) => {
                const ui = toUIProperty(p);
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDetailProperty(p)}>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={ui.image} alt={p.title} className="h-10 w-14 rounded object-cover shrink-0" /><div className="min-w-0"><p className="font-medium truncate">{p.title}</p><p className="text-xs text-muted-foreground truncate">{p.address}</p></div></div></td>
                    <td className="px-5 py-3 text-muted-foreground">{p.type}</td>
                    <td className="px-5 py-3 font-semibold text-accent">{formatPrice(p.price, p.currency)}</td>
                    <td className="px-5 py-3"><StatusBadge status={ui.status} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{p.rooms}amb · {p.bathrooms}ba · {ui.area}m²</td>
                    <td className="px-5 py-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron propiedades.</div>}
        </div>
      )}

      <PropertyDetailModal property={detailProperty} onClose={() => setDetailProperty(null)} onEdit={openEdit} />
      <PropertyDrawer open={drawerOpen} property={editProperty} onClose={() => { setDrawerOpen(false); setEditProperty(null); }} />
    </div>
  );
}
