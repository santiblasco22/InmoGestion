import { useEffect, useState } from "react";
import { aiApi, ApiAIDashboardLead } from "@/lib/api";
import { Sparkles, Loader2, Phone, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const STAGE_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  VISITA_AGENDADA: "Visita agendada",
  OFERTA_REALIZADA: "Oferta realizada",
};

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">Sin score</span>;
  const color = score >= 70 ? "bg-green-500/15 text-green-400" : score >= 40 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

export default function AIDashboardPage() {
  const [leads, setLeads] = useState<ApiAIDashboardLead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { leads } = await aiApi.dashboard();
      setLeads(leads);
    } catch {
      toast.error("Error al cargar el dashboard IA");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const scored = leads.filter(l => l.aiScore != null);
  const unscored = leads.filter(l => l.aiScore == null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Dashboard IA</h1>
          <span className="text-sm text-muted-foreground">— leads ordenados por score</span>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay leads activos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {scored.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Con score IA ({scored.length})</p>
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Score</th>
                      <th className="text-left px-4 py-3 font-medium">Lead</th>
                      <th className="text-left px-4 py-3 font-medium">Etapa</th>
                      <th className="text-left px-4 py-3 font-medium">Resumen IA</th>
                      <th className="text-left px-4 py-3 font-medium">Último contacto</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {scored.map((lead) => (
                      <tr key={lead.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <ScoreBadge score={lead.aiScore} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.phone ?? lead.email ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{STAGE_LABELS[lead.stage] ?? lead.stage}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs">
                          <p className="truncate text-xs">{lead.aiSummary ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: es })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {lead.phone && (
                              <a
                                href={`https://wa.me/54${lead.phone.replace(/\D/g, "").slice(-10)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-colors"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            )}
                            {lead.phone && (
                              <a href={`tel:${lead.phone}`} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {unscored.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sin analizar ({unscored.length}) — abrí el lead y hacé clic en "Analizar"</p>
              <div className="grid gap-2">
                {unscored.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{STAGE_LABELS[lead.stage] ?? lead.stage}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
