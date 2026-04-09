import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface Props {
  label?: string;
}

export function GoogleSignInButton({ label }: Props) {
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
      <div className="flex justify-center py-2">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("No se pudo iniciar sesión con Google")}
        text={label === "Registrarse con Google" ? "signup_with" : "signin_with"}
        shape="rectangular"
        width="320"
      />
    </div>
  );
}
