import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
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
        </div>

        <div className="rounded-xl border bg-card p-8 shadow-sm space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Revisá tu email</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Si <span className="font-medium text-foreground">{email}</span> está registrado, te enviamos un enlace para restablecer tu contraseña.
                </p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />Volver al login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-lg font-semibold">Recuperar contraseña</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Ingresá tu email y te enviamos un enlace para restablecerla.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="pl-9"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground"
                  disabled={loading || !email}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar enlace
                </Button>
              </form>

              <div className="pt-2 border-t text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" />Volver al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
