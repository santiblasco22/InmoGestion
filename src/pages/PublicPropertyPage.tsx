import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BedDouble, Bath, Maximize2, MapPin, Phone, Mail, Building2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

interface PublicProperty {
  id: string; title: string; description?: string | null;
  address: string; neighborhood: string; city: string;
  price: string; currency: string; type: string; status: string;
  rooms: number; bathrooms: number; area: string;
  amenities: string[]; photos: string[];
  agent: { name: string; phone?: string | null; email: string };
}

const TYPE_LABELS: Record<string, string> = {
  CASA: "Casa", DEPTO: "Departamento", OFICINA: "Oficina",
  PH: "PH", LOCAL: "Local", TERRENO: "Terreno",
};
const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: "bg-green-100 text-green-700",
  RESERVADO: "bg-amber-100 text-amber-700",
  VENDIDO: "bg-red-100 text-red-700",
  ALQUILADO: "bg-blue-100 text-blue-700",
};

function formatPrice(price: string, currency: string) {
  const n = Number(price);
  if (currency === "USD") return `USD ${(n / 1000).toFixed(0)}k`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `$${n.toLocaleString("es-AR")}`;
}

export default function PublicPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    fetch(`${BASE_URL}/public/properties/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setProperty)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (notFound || !property) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center p-6">
      <Building2 className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="text-xl font-semibold">Propiedad no encontrada</h1>
      <p className="text-sm text-muted-foreground">El link puede haber expirado o la propiedad fue eliminada.</p>
    </div>
  );

  const photos = property.photos.length ? property.photos : [];
  const waLink = property.agent.phone
    ? `https://wa.me/54${property.agent.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hola, vi la propiedad "${property.title}" y me interesa más información.`)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground">InmoGestión</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Photos */}
        {photos.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden h-72 bg-muted">
            <img src={photos[photoIdx]} alt={property.title} className="w-full h-full object-cover" />
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 right-3 rounded-full bg-black/50 text-white text-xs px-2 py-0.5">
                  {photoIdx + 1}/{photos.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Title + price */}
        <div className="space-y-2">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold">{property.title}</h1>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />{property.address}, {property.neighborhood}, {property.city}
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[property.status] ?? "bg-muted text-muted-foreground"}`}>
              {property.status}
            </span>
          </div>
          <p className="text-3xl font-bold text-accent">{formatPrice(property.price, property.currency)}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { Icon: Building2, val: TYPE_LABELS[property.type] ?? property.type, label: "Tipo" },
            { Icon: BedDouble, val: property.rooms, label: "Ambientes" },
            { Icon: Bath, val: property.bathrooms, label: "Baños" },
            { Icon: Maximize2, val: `${Number(property.area)} m²`, label: "Superficie" },
          ].map(({ Icon, val, label }) => (
            <div key={label} className="rounded-xl border bg-card p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm font-bold">{val}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        {property.description && (
          <div>
            <h2 className="text-sm font-semibold mb-2">Descripción</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
          </div>
        )}

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">Amenidades</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
            </div>
          </div>
        )}

        {/* Agent contact */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Contactar al agente</h2>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
              {property.agent.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{property.agent.name}</p>
              <p className="text-xs text-muted-foreground">Agente InmoGestión</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 text-sm font-medium transition-colors">
                <Phone className="h-4 w-4" />WhatsApp
              </a>
            )}
            <a href={`mailto:${property.agent.email}?subject=Consulta sobre ${property.title}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border bg-card hover:bg-muted px-4 py-2.5 text-sm font-medium transition-colors">
              <Mail className="h-4 w-4" />Email
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
