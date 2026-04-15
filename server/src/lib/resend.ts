import { Resend } from "resend";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@inmogestion.com";

/** Email templates */

/**
 * Sends a welcome email to a newly registered agent.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Bienvenido/a a InmoGestión",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F2942; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">InmoGestión</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0F172A; font-size: 18px;">¡Hola, ${name}!</h2>
          <p style="color: #64748B; line-height: 1.6;">
            Tu cuenta en InmoGestión fue creada con éxito. Ya podés empezar a gestionar
            tus propiedades, leads y visitas desde un solo lugar.
          </p>
          <a href="${process.env.CLIENT_URL}" style="display: inline-block; background: #1A7FA8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; font-weight: 500;">
            Ir al dashboard →
          </a>
        </div>
      </div>
    `,
  });
}

/**
 * Sends a visit confirmation email to a client (lead).
 */
export async function sendVisitConfirmation(
  to: string,
  clientName: string,
  propertyTitle: string,
  scheduledAt: Date,
  visitType: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  const dateStr = scheduledAt.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = scheduledAt.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Visita confirmada — ${propertyTitle}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F2942; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">InmoGestión</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0F172A; font-size: 18px;">¡Hola, ${clientName}!</h2>
          <p style="color: #64748B; line-height: 1.6;">
            Tu visita fue confirmada para <strong>${propertyTitle}</strong>.
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #0F172A;"><strong>📅 Fecha:</strong> ${dateStr}</p>
            <p style="margin: 8px 0 0; color: #0F172A;"><strong>🕐 Hora:</strong> ${timeStr}</p>
            <p style="margin: 8px 0 0; color: #0F172A;"><strong>📍 Modalidad:</strong> ${visitType}</p>
          </div>
          <p style="color: #64748B;">¿Necesitás reprogramar? Respondé este email o contactanos por WhatsApp.</p>
        </div>
      </div>
    `,
  });
}

/**
 * Sends a daily digest email to an agent.
 */
export async function sendDailyDigest(
  to: string,
  agentName: string,
  digest: {
    urgentLeads: { name: string; daysSince: number; score?: number | null }[];
    todayVisits: { clientName: string; propertyTitle: string; time: string }[];
    topLeads: { name: string; score: number }[];
  }
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const urgentSection = digest.urgentLeads.length
    ? digest.urgentLeads
        .map((l) => `<li><strong>${l.name}</strong> — sin actividad hace ${l.daysSince} días${l.score != null ? ` · Score: ${l.score}` : ""}</li>`)
        .join("")
    : "<li style='color:#64748B'>Ninguno por ahora</li>";

  const visitsSection = digest.todayVisits.length
    ? digest.todayVisits
        .map((v) => `<li>${v.time} — <strong>${v.propertyTitle}</strong> con ${v.clientName}</li>`)
        .join("")
    : "<li style='color:#64748B'>Sin visitas hoy</li>";

  const topSection = digest.topLeads.length
    ? digest.topLeads
        .map((l) => `<li><strong>${l.name}</strong> — Score IA: ${l.score}</li>`)
        .join("")
    : "<li style='color:#64748B'>Sin leads analizados aún</li>";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `☀️ Tu resumen diario — ${new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F2942; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">InmoGestión · Resumen del día</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px;">
          <p style="color: #64748B;">Hola <strong>${agentName}</strong>, acá está tu resumen de hoy:</p>

          <h3 style="color: #B45309; font-size: 14px; margin-bottom: 8px;">⚠️ Leads que necesitan seguimiento</h3>
          <ul style="color: #0F172A; font-size: 13px; line-height: 1.8; margin: 0 0 20px;">${urgentSection}</ul>

          <h3 style="color: #0F2942; font-size: 14px; margin-bottom: 8px;">📅 Visitas de hoy</h3>
          <ul style="color: #0F172A; font-size: 13px; line-height: 1.8; margin: 0 0 20px;">${visitsSection}</ul>

          <h3 style="color: #0F6B3B; font-size: 14px; margin-bottom: 8px;">🏆 Top leads por score IA</h3>
          <ul style="color: #0F172A; font-size: 13px; line-height: 1.8; margin: 0 0 24px;">${topSection}</ul>

          <a href="${process.env.CLIENT_URL ?? "https://inmo-gestion.vercel.app"}" style="display: inline-block; background: #1A7FA8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Abrir CRM →
          </a>
        </div>
      </div>
    `,
  });
}

/**
 * Sends a lead notification to the agent when a new inquiry arrives via the portal.
 */
export async function sendNewLeadNotification(
  agentEmail: string,
  agentName: string,
  leadName: string,
  leadPhone: string,
  propertyTitle: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: agentEmail,
    subject: `Nuevo lead: ${leadName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0F2942; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">InmoGestión</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0F172A; font-size: 18px;">¡Nuevo lead, ${agentName}!</h2>
          <p style="color: #64748B;">
            <strong>${leadName}</strong> consultó por <strong>${propertyTitle}</strong>.
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #0F172A;"><strong>Nombre:</strong> ${leadName}</p>
            <p style="margin: 8px 0 0; color: #0F172A;"><strong>Teléfono:</strong> ${leadPhone}</p>
            <p style="margin: 8px 0 0; color: #0F172A;"><strong>Propiedad:</strong> ${propertyTitle}</p>
          </div>
          <a href="${process.env.CLIENT_URL}/leads" style="display: inline-block; background: #1A7FA8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Ver en CRM →
          </a>
        </div>
      </div>
    `,
  });
}
