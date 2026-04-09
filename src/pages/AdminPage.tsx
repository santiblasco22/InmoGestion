import { useEffect, useState } from "react";
import { adminApi, ApiAgentStats } from "@/lib/api";
import { Loader2, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [agents, setAgents] = useState<ApiAgentStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { agents } = await adminApi.agents();
      setAgents(agents);
    } catch {
      toast.error("Error al cargar agentes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (agent: ApiAgentStats) => {
    if (!confirm(`¿Eliminar la cuenta de ${agent.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await adminApi.deleteAgent(agent.id);
      toast.success(`Cuenta de ${agent.name} eliminada`);
      load();
    } catch {
      toast.error("No se pudo eliminar la cuenta");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Panel de administración</h1>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Rol</th>
                <th className="text-left px-4 py-3 font-medium">Propiedades</th>
                <th className="text-left px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{agent.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{agent.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${agent.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{agent._count.properties}</td>
                  <td className="px-4 py-3 text-muted-foreground">{agent._count.leads}</td>
                  <td className="px-4 py-3 text-right">
                    {agent.id !== currentUser?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(agent)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
