import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Loader2, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleButton";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const set = (f: string, v: string) => setForm((x) => ({ ...x, [f]: v }));

  const req8 = form.password.length >= 8;
  const reqUpper = /[A-Z]/.test(form.password);
  const reqSpecial = /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(form.password);
  const passOk = req8 && reqUpper && reqSpecial;
  const passMatch = form.password === form.confirm && form.confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passOk || !passMatch) return;
    setError("");
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      toast.success(`¡Bienvenido/a, ${form.name.split(" ")[0]}!`);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
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
            <span className="text-xl font-semibold tracking-tight">InmoGestión</span>
          </div>
          <p className="text-sm text-muted-foreground">CRM inmobiliario para agentes</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-lg font-semibold">Crear cuenta</h1>
            <p className="text-sm text-muted-foreground mt-1">Registrate gratis y empezá a gestionar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Juan García"
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Teléfono{" "}
                <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+54 11 1234-5678"
                autoComplete="tel"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className="space-y-0.5">
                  {[
                    { ok: req8, label: "Mínimo 8 caracteres" },
                    { ok: reqUpper, label: "Al menos una mayúscula" },
                    { ok: reqSpecial, label: "Al menos un carácter especial" },
                  ].map(({ ok, label }) => (
                    <p key={label} className={`text-[11px] flex items-center gap-1 ${ok ? "text-green-600" : "text-muted-foreground"}`}>
                      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                      {label}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmar contraseña *</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.confirm.length > 0 && (
                <p className={`text-[11px] flex items-center gap-1 ${passMatch ? "text-green-600" : "text-red-600"}`}>
                  {passMatch ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {passMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground"
              disabled={isLoading || !passOk || !passMatch || !form.name.trim() || !form.email.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o registrarse con</span>
            </div>
          </div>

          <GoogleSignInButton label="Registrarse con Google" />

          <div className="pt-2 border-t text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
