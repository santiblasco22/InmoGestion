// Datos ficticios para el CRM inmobiliario

export interface Property {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  price: number;
  type: "Casa" | "Departamento" | "Comercial" | "Terreno";
  status: "Disponible" | "Reservado" | "Vendido" | "Alquilado";
  rooms: number;
  bathrooms: number;
  area: number;
  description: string;
  image: string;
  amenities: string[];
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget: string;
  source: "WhatsApp" | "Web" | "Referido" | "Portal";
  stage: "Nuevo" | "Contactado" | "Visita Agendada" | "Oferta Realizada" | "Cerrado Ganado" | "Cerrado Perdido";
  lastContact: string;
  lastActivity: string;
  notes: { date: string; text: string }[];
}

export interface Visit {
  id: string;
  clientName: string;
  propertyAddress: string;
  propertyTitle: string;
  date: string;
  time: string;
  type: "Presencial" | "Virtual";
  status: "Confirmada" | "Pendiente" | "Completada" | "Cancelada";
}

export const properties: Property[] = [
  { id: "p1", title: "Casa en Palermo Soho", address: "Honduras 4800, Palermo", neighborhood: "Palermo", price: 285000000, type: "Casa", status: "Disponible", rooms: 4, bathrooms: 3, area: 220, description: "Hermosa casa reciclada con patio y terraza.", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop", amenities: ["Patio", "Terraza", "Parrilla", "Cochera"] },
  { id: "p2", title: "Depto en Recoleta", address: "Av. Alvear 1500, Recoleta", neighborhood: "Recoleta", price: 195000000, type: "Departamento", status: "Disponible", rooms: 3, bathrooms: 2, area: 120, description: "Departamento de categoría con vista al parque.", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop", amenities: ["Balcón", "Pileta", "SUM", "Seguridad 24hs"] },
  { id: "p3", title: "Oficina en Microcentro", address: "Florida 350, Microcentro", neighborhood: "Microcentro", price: 85000000, type: "Comercial", status: "Alquilado", rooms: 1, bathrooms: 1, area: 65, description: "Oficina luminosa en pleno centro financiero.", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop", amenities: ["Aire acondicionado", "Recepción"] },
  { id: "p4", title: "Casa en Belgrano R", address: "Echeverría 3200, Belgrano", neighborhood: "Belgrano", price: 420000000, type: "Casa", status: "Reservado", rooms: 5, bathrooms: 4, area: 350, description: "Casona señorial con jardín y pileta.", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop", amenities: ["Jardín", "Pileta", "Cochera x2", "Quincho"] },
  { id: "p5", title: "Monoambiente en Núñez", address: "Cabildo 4100, Núñez", neighborhood: "Núñez", price: 62000000, type: "Departamento", status: "Vendido", rooms: 1, bathrooms: 1, area: 38, description: "Ideal inversión, a 3 cuadras del subte.", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop", amenities: ["Balcón", "Laundry"] },
  { id: "p6", title: "PH en Villa Crespo", address: "Thames 600, Villa Crespo", neighborhood: "Villa Crespo", price: 175000000, type: "Casa", status: "Disponible", rooms: 3, bathrooms: 2, area: 140, description: "PH luminoso con terraza propia, sin expensas.", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop", amenities: ["Terraza", "Parrilla", "Sin expensas"] },
  { id: "p7", title: "Local en San Telmo", address: "Defensa 900, San Telmo", neighborhood: "San Telmo", price: 120000000, type: "Comercial", status: "Disponible", rooms: 1, bathrooms: 1, area: 90, description: "Local a la calle en zona de alto tránsito.", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop", amenities: ["Vidriera", "Depósito"] },
  { id: "p8", title: "Depto en Puerto Madero", address: "Olga Cossettini 1200, Puerto Madero", neighborhood: "Puerto Madero", price: 650000000, type: "Departamento", status: "Reservado", rooms: 3, bathrooms: 3, area: 180, description: "Piso alto con vista al río y amenities premium.", image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop", amenities: ["Pileta", "Gym", "Sauna", "Seguridad 24hs", "Cochera"] },
];

export const leads: Lead[] = [
  { id: "l1", name: "Martín González", email: "martin.g@email.com", phone: "+54 11 5555-0101", propertyInterest: "Casa en Palermo Soho", budget: "$250M - $300M", source: "Web", stage: "Visita Agendada", lastContact: "2026-04-03", lastActivity: "Agendó visita para el 7/4", notes: [{ date: "2026-04-01", text: "Consulta inicial por formulario web" }, { date: "2026-04-03", text: "Se agendó visita presencial" }] },
  { id: "l2", name: "Carolina López", email: "caro.lopez@email.com", phone: "+54 11 5555-0202", propertyInterest: "Depto en Recoleta", budget: "$180M - $220M", source: "Referido", stage: "Contactado", lastContact: "2026-04-04", lastActivity: "Llamada telefónica", notes: [{ date: "2026-04-02", text: "Referida por cliente anterior" }, { date: "2026-04-04", text: "Llamada: interesada en 3 amb con vista" }] },
  { id: "l3", name: "Roberto Fernández", email: "r.fernandez@email.com", phone: "+54 11 5555-0303", propertyInterest: "Oficina en Microcentro", budget: "$70M - $100M", source: "Portal", stage: "Oferta Realizada", lastContact: "2026-04-02", lastActivity: "Oferta enviada $82M", notes: [{ date: "2026-03-28", text: "Contacto por ZonaProp" }, { date: "2026-04-02", text: "Presentó oferta por $82M" }] },
  { id: "l4", name: "Ana María Ruiz", email: "ana.ruiz@email.com", phone: "+54 11 5555-0404", propertyInterest: "Casa en Belgrano R", budget: "$400M - $450M", source: "WhatsApp", stage: "Nuevo", lastContact: "2026-04-05", lastActivity: "Mensaje de WhatsApp", notes: [{ date: "2026-04-05", text: "Consulta por WhatsApp sobre la casona" }] },
  { id: "l5", name: "Diego Martínez", email: "diego.m@email.com", phone: "+54 11 5555-0505", propertyInterest: "PH en Villa Crespo", budget: "$150M - $190M", source: "Web", stage: "Cerrado Ganado", lastContact: "2026-03-30", lastActivity: "Firma de boleto", notes: [{ date: "2026-03-15", text: "Primera consulta" }, { date: "2026-03-30", text: "Cerrado: firma de boleto" }] },
  { id: "l6", name: "Lucía Herrera", email: "lucia.h@email.com", phone: "+54 11 5555-0606", propertyInterest: "Monoambiente en Núñez", budget: "$55M - $70M", source: "Portal", stage: "Cerrado Perdido", lastContact: "2026-03-25", lastActivity: "No respondió seguimiento", notes: [{ date: "2026-03-20", text: "Interesada como inversión" }, { date: "2026-03-25", text: "No respondió, cerrado" }] },
  { id: "l7", name: "Federico Álvarez", email: "fede.a@email.com", phone: "+54 11 5555-0707", propertyInterest: "Depto en Puerto Madero", budget: "$600M - $700M", source: "Referido", stage: "Visita Agendada", lastContact: "2026-04-04", lastActivity: "Visita agendada para 8/4", notes: [{ date: "2026-04-04", text: "Referido, busca premium con amenities" }] },
  { id: "l8", name: "Sofía Peralta", email: "sofia.p@email.com", phone: "+54 11 5555-0808", propertyInterest: "Local en San Telmo", budget: "$100M - $130M", source: "WhatsApp", stage: "Contactado", lastContact: "2026-04-03", lastActivity: "Envío de fotos por WhatsApp", notes: [{ date: "2026-04-03", text: "Busca local para gastronomía" }] },
];

export const visits: Visit[] = [
  { id: "v1", clientName: "Martín González", propertyAddress: "Honduras 4800", propertyTitle: "Casa en Palermo Soho", date: "2026-04-07", time: "10:00", type: "Presencial", status: "Confirmada" },
  { id: "v2", clientName: "Federico Álvarez", propertyAddress: "Olga Cossettini 1200", propertyTitle: "Depto en Puerto Madero", date: "2026-04-08", time: "15:00", type: "Presencial", status: "Pendiente" },
  { id: "v3", clientName: "Carolina López", propertyAddress: "Av. Alvear 1500", propertyTitle: "Depto en Recoleta", date: "2026-04-09", time: "11:00", type: "Virtual", status: "Pendiente" },
  { id: "v4", clientName: "Sofía Peralta", propertyAddress: "Defensa 900", propertyTitle: "Local en San Telmo", date: "2026-04-10", time: "16:30", type: "Presencial", status: "Confirmada" },
  { id: "v5", clientName: "Ana María Ruiz", propertyAddress: "Echeverría 3200", propertyTitle: "Casa en Belgrano R", date: "2026-04-11", time: "09:00", type: "Presencial", status: "Pendiente" },
  { id: "v6", clientName: "Martín González", propertyAddress: "Thames 600", propertyTitle: "PH en Villa Crespo", date: "2026-04-06", time: "14:00", type: "Presencial", status: "Confirmada" },
  { id: "v7", clientName: "Roberto Fernández", propertyAddress: "Florida 350", propertyTitle: "Oficina en Microcentro", date: "2026-04-05", time: "10:30", type: "Presencial", status: "Completada" },
];

export const monthlyLeads = [
  { month: "Nov", leads: 12 },
  { month: "Dic", leads: 8 },
  { month: "Ene", leads: 15 },
  { month: "Feb", leads: 18 },
  { month: "Mar", leads: 22 },
  { month: "Abr", leads: 14 },
];

export const visitsPerProperty = [
  { property: "Palermo Soho", visits: 8 },
  { property: "Recoleta", visits: 6 },
  { property: "Puerto Madero", visits: 5 },
  { property: "Belgrano R", visits: 4 },
  { property: "Villa Crespo", visits: 7 },
  { property: "San Telmo", visits: 3 },
  { property: "Microcentro", visits: 2 },
  { property: "Núñez", visits: 4 },
];

export const pipelineFunnel = [
  { stage: "Nuevos", count: 15 },
  { stage: "Contactados", count: 12 },
  { stage: "Visita Agendada", count: 8 },
  { stage: "Oferta Realizada", count: 4 },
  { stage: "Cerrado Ganado", count: 3 },
];

export function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(0)}M`;
  }
  return `$${price.toLocaleString("es-AR")}`;
}
