import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, Bell, Shield, Loader2,
  Phone, Mail, BadgeCheck, Eye, EyeOff, CheckCircle2,
  AlertCircle, LogOut, Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi, settingsApi, ApiAutomationSettings } from "@/lib/api";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, description, icon: Icon, children,
}: {
  title: string; description?: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
  });

  // Keep form in sync if user changes
  useEffect(() => {
    setForm({ name: user?.name ?? "", phone: user?.phone ?? "" });
  }, [user?.id]);

  const initials = form.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AG";

  const isDirty = form.name !== (user?.name ?? "") || form.phone !== (user?.phone ?? "");

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { user: updated } = await authApi.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
      });
      setUser(updated);
      toast.success("Perfil actualizado correctamente");
    } catch {
      toast.error("No se pudo actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Perfil profesional" description="Información visible en el portal del cliente" icon={User}>
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold select-none">
              {initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-card" />
          </div>
          <div>
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role === "ADMIN" ? "Administrador" : "Agente"} · InmoGestión</p>
            <Badge variant="outline" className="mt-1 text-[10px] h-5 px-1.5 gap-1">
              <BadgeCheck className="h-3 w-3 text-primary" />Cuenta verificada
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nombre completo *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1"
              placeholder="Tu nombre completo"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input id="email" value={user?.email ?? ""} disabled className="pl-9 bg-muted/50 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">El email no se puede cambiar</p>
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="pl-9"
                placeholder="+54 11 1234-5678"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            className="bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={saving || !isDirty || !form.name.trim()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </div>
    </Section>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection() {
  const { logout } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  const nextOk = form.next.length >= 8;
  const match = form.next === form.confirm && form.confirm.length > 0;
  const canSubmit = form.current.length > 0 && nextOk && match;

  const handleChange = async () => {
    setSaving(true);
    try {
      await authApi.changePassword(form.current, form.next);
      toast.success("Contraseña actualizada. Volvé a ingresar.");
      setForm({ current: "", next: "", confirm: "" });
      // Tokens were revoked server-side; log out after a moment
      setTimeout(() => logout(), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo actualizar la contraseña";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (f: keyof typeof show) => setShow((s) => ({ ...s, [f]: !s[f] }));

  const PasswordInput = ({
    id, label, field, hint,
  }: { id: string; label: string; field: keyof typeof form; hint?: React.ReactNode }) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type={show[field as keyof typeof show] ? "text" : "password"}
          value={form[field]}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className="pr-10"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => toggle(field as keyof typeof show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show[field as keyof typeof show] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint}
    </div>
  );

  return (
    <Section title="Seguridad" description="Cambiá tu contraseña de acceso" icon={Shield}>
      <div className="space-y-4">
        <PasswordInput id="current" label="Contraseña actual" field="current" />
        <Separator />
        <PasswordInput
          id="next"
          label="Nueva contraseña"
          field="next"
          hint={
            form.next.length > 0 && (
              <p className={`text-[11px] mt-1 flex items-center gap-1 ${nextOk ? "text-green-600" : "text-amber-600"}`}>
                {nextOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {nextOk ? "Longitud correcta" : "Mínimo 8 caracteres"}
              </p>
            )
          }
        />
        <PasswordInput
          id="confirm"
          label="Confirmar nueva contraseña"
          field="confirm"
          hint={
            form.confirm.length > 0 && (
              <p className={`text-[11px] mt-1 flex items-center gap-1 ${match ? "text-green-600" : "text-red-600"}`}>
                {match ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {match ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
              </p>
            )
          }
        />
        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={handleChange} disabled={!canSubmit || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            Cambiar contraseña
          </Button>
        </div>
      </div>
    </Section>
  );
}

// ─── Notifications section ────────────────────────────────────────────────────

const NOTIF_KEY = "inmogestion-notif-prefs";

const NOTIF_ITEMS = [
  { key: "newLeads", title: "Nuevos leads", desc: "Alerta al registrarse un nuevo lead desde el portal" },
  { key: "visitReminders", title: "Recordatorio de visitas", desc: "24 horas antes de cada visita agendada" },
  { key: "offerAlerts", title: "Alertas de ofertas", desc: "Cuando un lead realiza una oferta sobre una propiedad" },
  { key: "weeklyReport", title: "Resumen semanal", desc: "Reporte de actividad cada lunes a las 9:00 hs" },
  { key: "portalErrors", title: "Errores de sincronización", desc: "Cuando una publicación en portales falla" },
];

function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "{}");
    } catch {
      return {};
    }
  });

  const defaults: Record<string, boolean> = {
    newLeads: true, visitReminders: true, offerAlerts: true,
    weeklyReport: false, portalErrors: true,
  };

  const get = (key: string) => prefs[key] ?? defaults[key];

  const toggle = (key: string) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !get(key) };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
    toast.success("Preferencia guardada");
  };

  return (
    <Section title="Notificaciones" description="Qué alertas querés recibir" icon={Bell}>
      <div className="divide-y">
        {NOTIF_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch checked={get(item.key)} onCheckedChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Automation section ───────────────────────────────────────────────────────

const AUTOMATION_ITEMS: {
  key: keyof ApiAutomationSettings;
  title: string;
  desc: string;
}[] = [
  {
    key: "autoAdvanceStage",
    title: "Auto-avanzar etapa del lead",
    desc: "Al crear una visita → mueve el lead a Visita Agendada. Al marcarla como realizada → avanza a Oferta Realizada.",
  },
  {
    key: "autoMatchProperties",
    title: "Auto-matching de propiedades con IA",
    desc: "Al crear un lead con preferencias de búsqueda, la IA asigna automáticamente la propiedad más compatible.",
  },
  {
    key: "dailyDigestEnabled",
    title: "Resumen diario por email",
    desc: "Recibís un email cada mañana con leads urgentes, visitas del día y top scores IA. Requiere Resend configurado.",
  },
  {
    key: "autoPortalSync",
    title: "Sincronización automática de portales",
    desc: "Al cambiar el estado de una propiedad a Disponible, se publica automáticamente en todos los portales.",
  },
];

function AutomationSection() {
  const [settings, setSettings] = useState<ApiAutomationSettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.getAutomation()
      .then(setSettings)
      .catch(() => {
        // Use safe defaults if backend doesn't support this endpoint yet
        setSettings({ autoAdvanceStage: true, autoMatchProperties: false, dailyDigestEnabled: false, autoPortalSync: false });
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof ApiAutomationSettings) => {
    if (!settings) return;
    const newValue = !settings[key];
    setSaving(key);
    try {
      const updated = await settingsApi.updateAutomation({ [key]: newValue });
      setSettings(updated);
      toast.success("Automatización actualizada");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Section title="Automatizaciones" description="Qué acciones ejecuta el sistema automáticamente" icon={Zap}>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="divide-y">
          {AUTOMATION_ITEMS.map((item) => (
            <div key={item.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              {saving === item.key ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5 text-muted-foreground" />
              ) : (
                <Switch
                  checked={settings?.[item.key] ?? false}
                  onCheckedChange={() => toggle(item.key)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Account section ──────────────────────────────────────────────────────────

function AccountSection() {
  const { user, logout } = useAuthStore();

  return (
    <Section title="Cuenta" description="Sesión activa y datos de registro" icon={BadgeCheck}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Plan actual</p>
            <p className="font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Pro — Activo
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Miembro desde</p>
            <p className="font-medium">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long" }) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Rol</p>
            <p className="font-medium capitalize">{user?.role === "ADMIN" ? "Administrador" : "Agente"}</p>
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">ID de cuenta</p>
            <p className="font-mono text-xs text-muted-foreground truncate">{user?.id ?? "—"}</p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cerrar sesión</p>
            <p className="text-xs text-muted-foreground">Salir de InmoGestión en este dispositivo</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </Section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Administrá tu perfil, seguridad y preferencias</p>
      </div>

      <ProfileSection />
      <AutomationSection />
      <NotificationsSection />
      <PasswordSection />
      <AccountSection />
    </div>
  );
}
