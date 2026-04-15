import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeLead(lead: {
  name: string;
  budget?: string | null;
  budgetCurrency: string;
  source: string;
  stage: string;
  createdAt: string;
  notes: { content: string; createdAt: string }[];
  visits: { scheduledAt: string; type: string; status: string }[];
  interestedProperties: { title: string; status: string }[];
  prefZones?: string[];
  prefTypes?: string[];
  prefMinRooms?: number;
  prefMaxRooms?: number;
  prefCondition?: string;
}): Promise<{ score: number; closingProbability: number; recommendation: string; summary: string }> {
  const prompt = `Sos un experto en ventas inmobiliarias. Analizá este lead y devolvé un JSON con el siguiente formato exacto:
{
  "score": <número 0-100 que indica la calidad del lead>,
  "closingProbability": <número 0-100 que indica la probabilidad de cierre>,
  "recommendation": "<acción concreta a tomar ahora mismo, máximo 20 palabras>",
  "summary": "<análisis breve del lead, máximo 40 palabras>"
}

Datos del lead:
- Nombre: ${lead.name}
- Presupuesto: ${lead.budget ? `${lead.budget} ${lead.budgetCurrency}` : "No especificado"}
- Fuente: ${lead.source}
- Etapa actual: ${lead.stage}
- Fecha de ingreso: ${new Date(lead.createdAt).toLocaleDateString("es-AR")}
- Visitas realizadas: ${lead.visits.length} (${lead.visits.filter(v => v.status === "REALIZADA").length} completadas)
- Propiedades de interés: ${lead.interestedProperties.map(p => p.title).join(", ") || "Ninguna"}
- Notas: ${lead.notes.map(n => n.content).join(" | ") || "Sin notas"}
- Zonas preferidas: ${lead.prefZones?.join(", ") || "No especificado"}
- Tipos de propiedad: ${lead.prefTypes?.join(", ") || "No especificado"}
- Ambientes: ${lead.prefMinRooms || lead.prefMaxRooms ? `${lead.prefMinRooms ?? 1} a ${lead.prefMaxRooms ?? "∞"}` : "No especificado"}
- Condición: ${lead.prefCondition || "No especificado"}

Respondé SOLO con el JSON, sin texto adicional.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}

export async function matchProperties(lead: {
  name: string;
  budget?: string | null;
  budgetCurrency: string;
  notes: { content: string }[];
}, properties: {
  id: string;
  title: string;
  price: string;
  currency: string;
  type: string;
  neighborhood: string;
  city: string;
  rooms: number;
  area: string;
  status: string;
}[]): Promise<{ propertyId: string; score: number; reason: string }[]> {
  const available = properties.filter(p => p.status === "DISPONIBLE");
  if (available.length === 0) return [];

  const prompt = `Sos un experto en ventas inmobiliarias. Dado este cliente y estas propiedades disponibles, devolvé un JSON array con las mejores 5 propiedades ordenadas por compatibilidad.

Formato exacto:
[
  { "propertyId": "<id>", "score": <0-100>, "reason": "<razón breve, máximo 15 palabras>" },
  ...
]

Cliente:
- Nombre: ${lead.name}
- Presupuesto: ${lead.budget ? `${lead.budget} ${lead.budgetCurrency}` : "No especificado"}
- Notas/preferencias: ${lead.notes.map(n => n.content).join(" | ") || "Sin notas"}

Propiedades disponibles:
${available.map(p => `ID: ${p.id} | ${p.title} | ${p.price} ${p.currency} | ${p.type} | ${p.rooms} amb | ${p.area}m² | ${p.neighborhood}, ${p.city}`).join("\n")}

Respondé SOLO con el JSON array, sin texto adicional.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(text);
}
