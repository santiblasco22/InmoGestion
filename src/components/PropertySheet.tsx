import jsPDF from "jspdf";
import { toast } from "sonner";
import { ApiProperty } from "@/lib/api";

function formatPrice(price: string | number, currency: string): string {
  const n = Number(price);
  if (currency === "USD") return `USD ${(n / 1000).toFixed(0)}k`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M ARS`;
  return `$${n.toLocaleString("es-AR")} ARS`;
}

const TYPE_LABELS: Record<string, string> = {
  CASA: "Casa", DEPTO: "Departamento", OFICINA: "Oficina",
  PH: "PH", LOCAL: "Local comercial", TERRENO: "Terreno",
};

const STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible", RESERVADO: "Reservado",
  VENDIDO: "Vendido", ALQUILADO: "Alquilado",
};

/**
 * Generates and downloads a branded PDF property sheet.
 */
export async function generatePropertySheet(property: ApiProperty, agentName: string): Promise<void> {
  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const margin = 18;

    // ── Header ──────────────────────────────────────────────────────────────
    pdf.setFillColor(15, 41, 66);
    pdf.rect(0, 0, W, 28, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(15);
    pdf.setFont("helvetica", "bold");
    pdf.text("InmoGestión", margin, 12);

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("CRM Inmobiliario — Ficha de propiedad", margin, 20);

    pdf.setFontSize(8);
    pdf.setTextColor(180, 210, 230);
    pdf.text(`Generado el ${new Date().toLocaleDateString("es-AR")} por ${agentName}`, W - margin, 20, { align: "right" });

    // ── Status badge ────────────────────────────────────────────────────────
    const status = STATUS_LABELS[property.status] ?? property.status;
    const statusColor: [number, number, number] = property.status === "DISPONIBLE"
      ? [34, 197, 94] : property.status === "RESERVADO"
      ? [245, 158, 11] : [100, 116, 139];
    pdf.setFillColor(...statusColor);
    pdf.roundedRect(W - margin - 28, 5, 28, 8, 2, 2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text(status, W - margin - 14, 10.2, { align: "center" });

    // ── Title & price ────────────────────────────────────────────────────────
    let y = 38;
    pdf.setTextColor(15, 41, 66);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(property.title, margin, y);

    y += 8;
    pdf.setFontSize(13);
    pdf.setTextColor(26, 127, 168);
    pdf.text(formatPrice(property.price, property.currency), margin, y);

    // ── Address ──────────────────────────────────────────────────────────────
    y += 7;
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${property.address} · ${property.neighborhood} · ${property.city}`, margin, y);

    // ── Divider ───────────────────────────────────────────────────────────────
    y += 6;
    pdf.setDrawColor(26, 127, 168);
    pdf.setLineWidth(0.4);
    pdf.line(margin, y, W - margin, y);

    // ── Stats row ─────────────────────────────────────────────────────────────
    y += 8;
    const stats = [
      { label: "Tipo", value: TYPE_LABELS[property.type] ?? property.type },
      { label: "Ambientes", value: String(property.rooms) },
      { label: "Baños", value: String(property.bathrooms) },
      { label: "Superficie", value: `${Number(property.area)} m²` },
    ];
    const colW = (W - margin * 2) / stats.length;
    stats.forEach(({ label, value }, i) => {
      const x = margin + i * colW;
      pdf.setFillColor(240, 248, 255);
      pdf.roundedRect(x, y - 4, colW - 3, 16, 2, 2, "F");
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(label.toUpperCase(), x + (colW - 3) / 2, y + 1, { align: "center" });
      pdf.setTextColor(15, 41, 66);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(value, x + (colW - 3) / 2, y + 8, { align: "center" });
    });

    // ── Description ───────────────────────────────────────────────────────────
    y += 22;
    if (property.description) {
      pdf.setTextColor(15, 41, 66);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Descripción", margin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const descLines = pdf.splitTextToSize(property.description, W - margin * 2);
      pdf.text(descLines, margin, y);
      y += descLines.length * 4.5 + 6;
    }

    // ── Amenities ─────────────────────────────────────────────────────────────
    if (property.amenities.length > 0) {
      pdf.setTextColor(15, 41, 66);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("Amenidades", margin, y);
      y += 5;

      let x = margin;
      const tagH = 7, tagPad = 4, gap = 2;
      property.amenities.forEach((a) => {
        const w = pdf.getTextWidth(a) + tagPad * 2;
        if (x + w > W - margin) { x = margin; y += tagH + gap + 1; }
        pdf.setFillColor(224, 242, 254);
        pdf.roundedRect(x, y - 5, w, tagH, 1.5, 1.5, "F");
        pdf.setTextColor(26, 127, 168);
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.text(a, x + tagPad, y - 0.5);
        x += w + gap;
      });
      y += tagH + 6;
    }

    // ── Photo (first one, if any) ─────────────────────────────────────────────
    if (property.photos.length > 0 && y < H - 60) {
      try {
        const photoUrl = property.photos[0];
        // Fetch image as base64
        const resp = await fetch(photoUrl);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const imgH = Math.min(60, H - y - 30);
        pdf.addImage(dataUrl, "JPEG", margin, y, W - margin * 2, imgH, undefined, "MEDIUM");
        y += imgH + 4;
      } catch {
        // Photo failed to load — skip silently
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    pdf.setFillColor(15, 41, 66);
    pdf.rect(0, H - 16, W, 16, "F");
    pdf.setTextColor(180, 210, 230);
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.text("InmoGestión — CRM Inmobiliario", margin, H - 6);
    pdf.text(`Agente: ${agentName}`, W - margin, H - 6, { align: "right" });

    const filename = `ficha_${property.title.replace(/\s+/g, "_").slice(0, 30)}.pdf`;
    pdf.save(filename);
    toast.success("Ficha descargada");
  } catch (err) {
    console.error(err);
    toast.error("No se pudo generar la ficha");
  }
}
