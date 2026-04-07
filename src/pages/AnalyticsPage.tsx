import { useEffect, useState } from "react";
import { Building2, Users, CalendarDays, Handshake, TrendingUp, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useAppStore } from "@/store/useAppStore";
import { analyticsApi } from "@/lib/api";

const funnelColors = ["#1A7FA8","#2196BD","#38B2D2","#F59E0B","#22C55E","#EF4444"];

export default function AnalyticsPage() {
  const { leads, properties, analytics } = useAppStore();
  const [leadsOverTime, setLeadsOverTime] = useState<{ month: string; leads: number }[]>([]);
  const [visitsPerProp, setVisitsPerProp] = useState<{ title: string; visits: number }[]>([]);
  const [pipelineFunnel, setPipelineFunnel] = useState<{ stage: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const STAGE_LABELS: Record<string, string> = {
    NUEVO: "Nuevo", CONTACTADO: "Contactado", VISITA_AGENDADA: "Visita Agendada",
    OFERTA_REALIZADA: "Oferta Realizada", CERRADO_GANADO: "Cerrado Ganado", CERRADO_PERDIDO: "Cerrado Perdido",
  };
  const SOURCE_LABELS: Record<string, string> = {
    WHATSAPP: "WhatsApp", WEB: "Web", REFERIDO: "Referido", PORTAL: "Portal", OTRO: "Otro",
  };

  useEffect(() => {
    Promise.all([
      analyticsApi.leadsOverTime(6),
      analyticsApi.visitsPerProperty(),
      analyticsApi.pipelineFunnel(),
    ]).then(([lot, vpp, pf]) => {
      setLeadsOverTime(lot);
      setVisitsPerProp(vpp);
      setPipelineFunnel(pf.map((f) => ({ stage: STAGE_LABELS[f.stage] ?? f.stage, count: f.count })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sourceBreakdown = Object.entries(SOURCE_LABELS).map(([key, label]) => ({
    source: label,
    count: leads.filter((l) => l.source === key).length,
  }));

  const kpis = [
    { title: "Publicaciones activas", value: analytics?.activeListings ?? 0, icon: Building2 },
    { title: "Leads este mes", value: analytics?.leadsThisMonth ?? 0, icon: Users },
    { title: "Visitas realizadas", value: analytics?.visitsThisMonth ?? 0, icon: CalendarDays },
    { title: "Operaciones cerradas", value: analytics?.closedWon ?? 0, icon: Handshake },
    { title: "Tasa de conversión", value: `${analytics?.conversionRate ?? 0}%`, icon: TrendingUp },
  ];

  const topProperties = properties.filter((p) => p.status !== "VENDIDO").slice(0, 6);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Analíticas</h1><p className="text-sm text-muted-foreground">Métricas de rendimiento y conversión</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => <StatCard key={k.title} {...k} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Leads por mes (últimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={leadsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="leads" stroke="#1A7FA8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Visitas por propiedad</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={visitsPerProp}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="title" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="visits" fill="#1A7FA8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Embudo de conversión</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pipelineFunnel} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={115} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {pipelineFunnel.map((_, i) => <Cell key={i} fill={funnelColors[i % funnelColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-4">Fuente de leads</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sourceBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
              <XAxis dataKey="source" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sourceBreakdown.map((_, i) => <Cell key={i} fill={funnelColors[i % funnelColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-5 py-3"><h2 className="text-sm font-semibold">Propiedades en cartera</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground bg-muted/20">
              <th className="px-5 py-2.5 font-medium">Propiedad</th>
              <th className="px-5 py-2.5 font-medium">Barrio</th>
              <th className="px-5 py-2.5 font-medium">Precio</th>
              <th className="px-5 py-2.5 font-medium">Consultas</th>
              <th className="px-5 py-2.5 font-medium">Estado</th>
            </tr></thead>
            <tbody>
              {topProperties.map((p, i) => {
                const price = Number(p.price);
                const priceStr = p.currency === "USD" ? `USD ${(price / 1000).toFixed(0)}k` : price >= 1_000_000 ? `$${(price / 1_000_000).toFixed(0)}M` : `$${price.toLocaleString("es-AR")}`;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3 font-medium">{p.title}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.neighborhood}</td>
                    <td className="px-5 py-3 font-semibold text-accent">{priceStr}</td>
                    <td className="px-5 py-3 text-muted-foreground">{Math.max(1, 8 - i)} consultas</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === "DISPONIBLE" ? "bg-green-100 text-green-700" : p.status === "RESERVADO" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
