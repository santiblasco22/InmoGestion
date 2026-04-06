import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, user } = useAuthStore();
  const [email, setEmail] = useState("agente@inmogestion.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      const name = useAuthStore.getState().user?.name?.split(" ")[0] ?? "bienvenido/a";
      toast.success(`¡Hola, ${name}!`);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground tracking-tight">InmoGestión</span>
          </div>
          <p className="text-sm text-muted-foreground">CRM inmobiliario para agentes</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground mt-1">Accedé a tu panel de gestión</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </form>

          <div className="pt-2 border-t space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              ¿No tenés cuenta?{" "}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Registrate gratis
              </Link>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Demo:{" "}
              <span className="font-mono text-foreground">agente@inmogestion.com</span>{" "}
              /{" "}
              <span className="font-mono text-foreground">demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
