import { useEffect, useState } from "react";
import { analyticsApi, ApiActivityItem } from "@/lib/api";
import { Loader2, GitCommitHorizontal, UserPlus, CalendarDays, TrendingDown, TrendingUp, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<ApiActivityItem["type"], string> = {
  stage: "Etapa",
  visit_scheduled: "Visita",
  new_lead: "Nuevo lead",
  price_change: "Precio",
};

const TYPE_COLORS: Record<ApiActivityItem["type"], string> = {
  stage: "bg-blue-100 text-blue-700",
  visit_scheduled: "bg-teal-100 text-teal-700",
  new_lead: "bg-green-100 text-green-700",
  price_change: "bg-amber-100 text-amber-700",
};

const TYPE_DOT: Record<ApiActivityItem["type"], string> = {
  stage: "bg-blue-500",
  visit_scheduled: "bg-teal-500",
  new_lead: "bg-green-500",
  price_change: "bg-amber-500",
};

function ActivityIcon({ type }: { type: ApiActivityItem["type"] }) {
  const cls = "h-4 w-4";
  if (type === "new_lead") return <UserPlus className={`${cls} text-green-600`} />;
  if (type === "visit_scheduled") return <CalendarDays className={`${cls} text-teal-600`} />;
  if (type === "price_change") return <TrendingDown className={`${cls} text-amber-600`} />;
  return <GitCommitHorizontal className={`${cls} text-blue-600`} />;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

const FILTERS: { label: string; value: ApiActivityItem["type"] | "all" }[] = [
  { label: "Todo", value: "all" },
  { label: "Etapas", value: "stage" },
  { label: "Visitas", value: "visit_scheduled" },
  { label: "Nuevos leads", value: "new_lead" },
  { label: "Precios", value: "price_change" },
];

export default function ActivityPage() {
  const [items, setItems] = useState<ApiActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApiActivityItem["type"] | "all">("all");
  const navigate = useNavigate();

  useEffect(() => {
    analyticsApi.activityFeed(100)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  // Group by date
  const grouped: { label: string; items: ApiActivityItem[] }[] = [];
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  for (const item of filtered) {
    const day = new Date(item.createdAt).toISOString().split("T")[0];
    const label = day === today ? "Hoy" : day === yesterday ? "Ayer" : new Date(item.createdAt).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    const group = grouped.find((g) => g.label === label);
    if (group) group.items.push(item);
    else grouped.push({ label, items: [item] });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Actividad</h1>
        <p className="text-sm text-muted-foreground">Feed de todo lo que pasó en tu CRM</p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Sin actividad registrada aún.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 sticky top-0 bg-background/95 py-1">
                {group.label}
              </p>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`relative flex gap-3 rounded-xl p-3 pl-11 transition-colors ${
                        item.leadId ? "hover:bg-muted/50 cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (item.leadId) navigate("/leads", { state: { openLeadId: item.leadId } });
                      }}
                    >
                      {/* Dot + icon */}
                      <div className={`absolute left-2.5 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted shrink-0`}>
                        <ActivityIcon type={item.type} />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {item.leadName && (
                              <span className="text-xs font-semibold text-foreground">{item.leadName}</span>
                            )}
                            {item.leadName && <span className="text-muted-foreground text-xs"> · </span>}
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[item.type]}`}>
                              {TYPE_LABELS[item.type]}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                            {relativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.content}</p>
                        {item.propertyTitle && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 italic">{item.propertyTitle}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
