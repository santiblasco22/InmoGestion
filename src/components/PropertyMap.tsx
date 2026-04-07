import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ApiProperty } from "@/lib/api";
import { toUIProperty } from "@/store/useAppStore";
import { MapPin, Loader2 } from "lucide-react";

// Fix default leaflet icon (webpack/vite asset issue)
delete (L.Icon.Default.prototype as never)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LatLng { lat: number; lng: number }

const GEO_CACHE_KEY = "inmogestion-geocache";

function loadCache(): Record<string, LatLng> {
  try { return JSON.parse(sessionStorage.getItem(GEO_CACHE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveCache(cache: Record<string, LatLng>) {
  try { sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); }
  catch {}
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const query = `${address}, Buenos Aires, Argentina`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

interface PropertyMapProps {
  properties: ApiProperty[];
  onSelectProperty: (p: ApiProperty) => void;
}

export function PropertyMap({ properties, onSelectProperty }: PropertyMapProps) {
  const [geoData, setGeoData] = useState<Record<string, LatLng>>(loadCache);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeQueue = useRef<string[]>([]);
  const processingRef = useRef(false);

  // Build geocode queue for properties not yet cached
  useEffect(() => {
    const uncached = properties.filter((p) => !geoData[p.id] && p.address);
    if (uncached.length === 0) return;
    geocodeQueue.current = uncached.map((p) => p.id);
    processQueue();
  }, [properties]);

  const processQueue = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setGeocoding(true);
    const cache = loadCache();

    while (geocodeQueue.current.length > 0) {
      const id = geocodeQueue.current.shift()!;
      if (cache[id]) continue;
      const prop = properties.find((p) => p.id === id);
      if (!prop?.address) continue;
      const coords = await geocodeAddress(prop.address);
      if (coords) {
        cache[id] = coords;
        setGeoData((prev) => ({ ...prev, [id]: coords }));
        saveCache(cache);
      }
      // Nominatim rate limit: 1 req/second
      await new Promise((r) => setTimeout(r, 1100));
    }

    processingRef.current = false;
    setGeocoding(false);
  };

  const mapped = properties.filter((p) => geoData[p.id]);
  const center: [number, number] = [-34.6037, -58.3816]; // Buenos Aires

  return (
    <div className="relative rounded-xl overflow-hidden border" style={{ height: 520 }}>
      {geocoding && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 rounded-lg bg-background/90 border shadow-sm px-3 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Geolocalizando...
        </div>
      )}
      {mapped.length === 0 && !geocoding && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-muted/40">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No se pudieron geolocalizar las propiedades</p>
        </div>
      )}
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map((p) => {
          const coords = geoData[p.id];
          const ui = toUIProperty(p);
          const price = Number(p.price);
          const priceStr = p.currency === "USD"
            ? `USD ${(price / 1000).toFixed(0)}k`
            : price >= 1_000_000
            ? `$${(price / 1_000_000).toFixed(1)}M`
            : `$${price.toLocaleString("es-AR")}`;
          return (
            <Marker key={p.id} position={[coords.lat, coords.lng]}>
              <Popup>
                <div className="space-y-1 min-w-[180px]">
                  {p.photos[0] && (
                    <img src={p.photos[0]} alt={p.title} className="w-full h-24 object-cover rounded" />
                  )}
                  <p className="font-semibold text-sm leading-tight">{p.title}</p>
                  <p className="text-xs text-gray-500">{p.address}</p>
                  <p className="text-sm font-bold text-blue-700">{priceStr}</p>
                  <p className="text-xs text-gray-500">{p.rooms} amb · {p.bathrooms} ba · {ui.area}m²</p>
                  <button
                    onClick={() => onSelectProperty(p)}
                    className="mt-1 w-full rounded bg-blue-600 text-white text-xs py-1 hover:bg-blue-700 transition-colors"
                  >
                    Ver detalle
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
