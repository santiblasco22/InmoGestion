import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";

const SEEN_KEY = "inmogestion-notif-seen";

function getSeenIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")); }
  catch { return new Set(); }
}

function markSeen(ids: string[]) {
  const existing = getSeenIds();
  ids.forEach((id) => existing.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...existing]));
}

export function NotificationBell() {
  const { visits, leads } = useAppStore();
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenIds);

  const now = Date.now();
  const in24h = now + 24 * 60 * 60 * 1000;
  const last24h = now - 24 * 60 * 60 * 1000;

  const notifications = useMemo(() => {
    const items: { id: string; type: "visit" | "lead"; title: string; body: string; time: Date }[] = [];

    // Upcoming visits in next 24h
    visits
      .filter((v) => {
        const t = new Date(v.scheduledAt).getTime();
        return v.status === "PENDIENTE" && t >= now && t <= in24h;
      })
      .forEach((v) => {
        const t = new Date(v.scheduledAt);
        const timeStr = t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        items.push({
          id: `visit-${v.id}`,
          type: "visit",
          title: "Visita próxima",
          body: `${(v as never as { lead?: { name: string } }).lead?.name ?? "Cliente"} · ${(v as never as { property?: { title: string } }).property?.title ?? "Propiedad"} a las ${timeStr}`,
          time: t,
        });
      });

    // New leads in last 24h
    leads
      .filter((l) => new Date(l.createdAt).getTime() >= last24h)
      .forEach((l) => {
        items.push({
          id: `lead-${l.id}`,
          type: "lead",
          title: "Nuevo lead",
          body: `${l.name} — ${l.source}`,
          time: new Date(l.createdAt),
        });
      });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [visits, leads]);

  const unread = notifications.filter((n) => !seenIds.has(n.id));

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && unread.length > 0) {
      const ids = unread.map((n) => n.id);
      markSeen(ids);
      setSeenIds((prev) => { const next = new Set(prev); ids.forEach((id) => next.add(id)); return next; });
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notificaciones</h3>
          {notifications.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{notifications.length}</Badge>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sin notificaciones recientes
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 flex gap-3 ${seenIds.has(n.id) ? "" : "bg-accent/5"}`}>
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${n.type === "visit" ? "bg-accent" : "bg-green-500"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {n.time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {n.time.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
