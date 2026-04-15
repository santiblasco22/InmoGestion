import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, Target, Zap, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiApi, ApiLeadAnalysis, ApiPropertyMatch } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  leadId: string;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 ${color}`}>
        <span className="text-lg font-bold">{value}</span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function LeadAIPanel({ leadId }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ApiLeadAnalysis | null>(null);
  const [matches, setMatches] = useState<ApiPropertyMatch[] | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([
        aiApi.analyzeLead(leadId),
        aiApi.matchProperties(leadId),
      ]);
      setAnalysis(a);
      setMatches(m);
    } catch {
      toast.error("Error al analizar con IA");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (v: number) =>
    v >= 70 ? "border-green-500 text-green-500" :
    v >= 40 ? "border-amber-500 text-amber-500" :
    "border-red-500 text-red-500";

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Análisis IA</span>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Analizando...</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5 mr-1.5" />{analysis ? "Reanalizar" : "Analizar"}</>
          )}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          {/* Scores */}
          <div className="flex justify-around py-2">
            <ScoreRing value={analysis.score} label="Score" color={scoreColor(analysis.score)} />
            <ScoreRing value={analysis.closingProbability} label="% Cierre" color={scoreColor(analysis.closingProbability)} />
          </div>

          {/* Recommendation */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 flex gap-2">
            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-primary mb-0.5">Acción recomendada</p>
              <p className="text-sm">{analysis.recommendation}</p>
            </div>
          </div>

          {/* Summary */}
          <div className="flex gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          </div>

          {/* Property matches */}
          {matches && matches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Propiedades ideales</span>
              </div>
              {matches.slice(0, 3).map((m) => (
                <div key={m.propertyId} className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <Home className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.property.title}</p>
                    <p className="text-xs text-muted-foreground">{m.reason}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${scoreColor(m.score).split(" ")[1]}`}>{m.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!analysis && !loading && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Hacé clic en "Analizar" para obtener el score, probabilidad de cierre y propiedades ideales para este lead.
        </p>
      )}
    </div>
  );
}
