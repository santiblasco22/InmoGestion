import { useState } from "react";
import { useAppStore, toUIProperty } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Bath, Maximize2, Phone, CalendarDays, Mail, MapPin, MessageCircle, Globe, Eye, Pencil, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function ClientPortalPage() {
  const { properties, leads, addLead } = useAppStore();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = properties.filter((p) => p.status === "DISPONIBLE" || p.status === "RESERVADO");
  const featured = properties.find((p) => p.id === selectedId) ?? available[0] ?? properties[0];
  const ui = featured ? toUIProperty(featured) : null;

  const set = (f: string, v: string) => setForm((x) => ({ ...x, [f]: v }));

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addLead({
        name: form.name, email: form.email || undefined, phone: form.phone || undefined,
        source: "WEB" as never, stage: "NUEVO" as never,
        propertyIds: featured ? [featured.id] : [],
      } as never);
      toast.success("¡Consulta enviada! Te contactamos a la brevedad.");
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch { toast.error("No se pudo enviar la consulta"); }
    finally { setSaving(false); }
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "AG";
  const waLink = `https://wa.me/54${(user?.phone ?? "").replace(/\D/g, "").slice(-10)}?text=Hola%20${encodeURIComponent(user?.name ?? "agente")}%2C%20consulto%20por%20${encodeURIComponent(featured?.title ?? "")}`;

  const priceLabel = (price: string | number, currency: string) => {
    const n = Number(price);
    return currency === "USD" ? `USD ${(n / 1000).toFixed(0)}k` : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(0)}M ARS` : `$${n.toLocaleString("es-AR")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">Portal del Cliente</h1><p className="text-sm text-muted-foreground">Vista pública para compradores · {leads.filter((l) => l.source === "WEB").length} leads desde el portal</p></div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        {/* Browser bar */}
        <div className="bg-muted px-4 py-2.5 flex items-center gap-3 border-b">
          <div className="flex gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400" /><div className="h-3 w-3 rounded-full bg-yellow-400" /><div className="h-3 w-3 rounded-full bg-green-400" /></div>
          <div className="flex-1 mx-2 rounded-md bg-card border px-3 py-1 text-xs text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3 shrink-0" />inmogestion.com/portal/{user?.name?.toLowerCase().replace(" ", "-") ?? "agente"}</div>
        </div>

        <div className="bg-[#F8FAFC]">
          {/* Agent header */}
          <div className="bg-[#0F2942] text-white px-6 py-5">
            <div className="max-w-5xl mx-auto flex items-center gap-4 flex-wrap">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1A7FA8] text-white text-lg font-bold shrink-0">{initials}</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold">{user?.name ?? "Agente Inmobiliario"}</h2>
                <p className="text-sm text-blue-200">Agente Inmobiliario · InmoGestión</p>
              </div>
              <div className="flex gap-2">
                {user?.phone && <Button size="sm" className="bg-[#1A7FA8] text-white hover:bg-[#1A7FA8]/90" asChild><a href={`tel:${user.phone}`}><Phone className="mr-1.5 h-3.5 w-3.5" />Llamar</a></Button>}
                <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" asChild><a href={waLink} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</a></Button>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
            {/* Properties grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Propiedades disponibles <span className="text-sm font-normal text-muted-foreground">({available.length})</span></h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {available.map((p) => {
                  const pui = toUIProperty(p);
                  return (
                    <button key={p.id} onClick={() => setSelectedId(p.id)}
                      className={`text-left rounded-xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition-all ${selectedId === p.id || (!selectedId && p.id === featured?.id) ? "ring-2 ring-[#1A7FA8]" : ""}`}>
                      <div className="relative h-44"><img src={pui.image} alt={p.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === "DISPONIBLE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{p.status === "DISPONIBLE" ? "Disponible" : "Reservado"}</span></div>
                      </div>
                      <div className="p-4">
                        <p className="text-lg font-bold text-[#1A7FA8]">{priceLabel(p.price, p.currency)}</p>
                        <p className="text-sm font-medium mt-0.5">{p.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{p.neighborhood}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t">
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{p.rooms} amb.</span>
                          <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.bathrooms} ba.</span>
                          <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{Number(p.area)} m²</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Featured detail */}
            {featured && ui && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="relative h-72"><img src={ui.image} alt={featured.title} className="w-full h-full object-cover" /></div>
                <div className="grid grid-cols-1 lg:grid-cols-3">
                  <div className="lg:col-span-2 p-6 space-y-5">
                    <div>
                      <h2 className="text-2xl font-semibold">{featured.title}</h2>
                      <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-4 w-4" />{featured.address}</p>
                      <p className="text-2xl font-bold text-[#1A7FA8] mt-2">{priceLabel(featured.price, featured.currency)}</p>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" />{featured.rooms} ambientes</span>
                      <span className="flex items-center gap-1.5"><Bath className="h-4 w-4" />{featured.bathrooms} baños</span>
                      <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4" />{Number(featured.area)} m²</span>
                    </div>
                    {featured.description && <div><h3 className="text-sm font-semibold mb-1">Descripción</h3><p className="text-sm text-muted-foreground leading-relaxed">{featured.description}</p></div>}
                    {featured.amenities.length > 0 && (
                      <div><h3 className="text-sm font-semibold mb-2">Amenidades</h3><div className="flex flex-wrap gap-2">{featured.amenities.map((a) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}</div></div>
                    )}
                  </div>
                  <div className="border-t lg:border-t-0 lg:border-l p-6 bg-muted/20">
                    {submitted ? (
                      <div className="text-center py-8 space-y-3">
                        <div className="text-5xl">✓</div>
                        <p className="text-sm font-medium text-success">¡Consulta enviada!</p>
                        <p className="text-xs text-muted-foreground">Te contactamos a la brevedad.</p>
                        <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>Nueva consulta</Button>
                      </div>
                    ) : (
                      <form onSubmit={handleContact} className="space-y-3">
                        <h3 className="text-sm font-semibold">Solicitar información</h3>
                        <div><Label className="text-xs">Tu nombre *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1 text-sm" required /></div>
                        <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1 text-sm" /></div>
                        <div><Label className="text-xs">Teléfono</Label><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1 text-sm" /></div>
                        <div><Label className="text-xs">Mensaje</Label><textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} /></div>
                        <Button type="submit" className="w-full bg-[#0F2942] text-white hover:bg-[#0F2942]/90" size="sm" disabled={saving}>
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Enviar consulta
                        </Button>
                        <Button type="button" className="w-full bg-green-600 text-white hover:bg-green-700" size="sm" asChild>
                          <a href={waLink} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Consultar por WhatsApp</a>
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
