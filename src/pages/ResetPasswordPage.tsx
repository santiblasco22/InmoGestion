import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pwOk = password.length >= 8;
  const match = password === confirm && confirm.length > 0;
  const canSubmit = pwOk && match && !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success("Contraseña restablecida. Ya podés ingresar.");
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "El enlace es inválido o expiró.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">Enlace inválido.</p>
          <Link to="/login" className="text-sm text-primary hover:underline">Volver al login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">InmoGestión</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-lg font-semibold">Nueva contraseña</h1>
            <p className="text-sm text-muted-foreground mt-1">Elegí una contraseña segura para tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <p className={`text-[11px] flex items-center gap-1 ${pwOk ? "text-green-600" : "text-amber-600"}`}>
                  {pwOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {pwOk ? "Longitud correcta" : "Mínimo 8 caracteres"}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showCf ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button type="button" onClick={() => setShowCf((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm.length > 0 && (
                <p className={`text-[11px] flex items-center gap-1 ${match ? "text-green-600" : "text-red-600"}`}>
                  {match ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {match ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={!canSubmit || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Restablecer contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
