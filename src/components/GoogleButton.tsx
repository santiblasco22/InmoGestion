import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function GoogleSignInButton({ label }: { label?: string }) {
  const { loginWithGoogle } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      const name = useAuthStore.getState().user?.name?.split(" ")[0] ?? "bienvenido/a";
      toast.success(`¡Hola, ${name}!`);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 h-10 w-full rounded-md border text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Conectando con Google...
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center [&>div]:w-full [&_iframe]:w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("No se pudo iniciar sesión con Google")}
        width="100%"
        text={label === "Registrarse con Google" ? "signup_with" : "signin_with"}
        shape="rectangular"
        logo_alignment="left"
        locale="es"
      />
    </div>
  );
}
