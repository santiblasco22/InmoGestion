/**
 * Seed script — populates the DB with realistic demo data.
 * Run with: npm run db:seed
 *
 * Agent: María Rodríguez — agente@inmogestion.com / demo1234
 */
import "dotenv/config";
import { PrismaClient, PropertyType, PropertyStatus, Currency, LeadSource, LeadStage, VisitType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addHours, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Agent user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const agent = await prisma.user.upsert({
    where: { email: "agente@inmogestion.com" },
    update: {},
    create: {
      email: "agente@inmogestion.com",
      password: passwordHash,
      name: "María Rodríguez",
      phone: "+54 11 5555-1234",
      role: "AGENT",
    },
  });

  console.log(`✓ Agent created: ${agent.email}`);

  // ─── Properties ──────────────────────────────────────────────────────────────
  const propertyData: Array<{
    title: string;
    description: string;
    address: string;
    neighborhood: string;
    price: number;
    currency: Currency;
    type: PropertyType;
    status: PropertyStatus;
    rooms: number;
    bathrooms: number;
    area: number;
    amenities: string[];
    photos: string[];
  }> = [
    {
      title: "Casa en Palermo Soho",
      description: "Hermosa casa reciclada con patio y terraza. Cocina abierta integrada al living. Materiales de primera calidad.",
      address: "Honduras 4800, Palermo",
      neighborhood: "Palermo",
      price: 285000000,
      currency: "ARS",
      type: "CASA",
      status: "DISPONIBLE",
      rooms: 4,
      bathrooms: 3,
      area: 220,
      amenities: ["Patio", "Terraza", "Parrilla", "Cochera"],
      photos: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"],
    },
    {
      title: "Departamento en Recoleta",
      description: "Departamento de categoría con vista al parque. Edificio con amenities y portería 24hs.",
      address: "Av. Alvear 1500, Recoleta",
      neighborhood: "Recoleta",
      price: 195000000,
      currency: "ARS",
      type: "DEPTO",
      status: "DISPONIBLE",
      rooms: 3,
      bathrooms: 2,
      area: 120,
      amenities: ["Balcón", "Pileta", "SUM", "Seguridad 24hs"],
      photos: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop"],
    },
    {
      title: "Oficina en Microcentro",
      description: "Oficina luminosa en pleno centro financiero. Ideal para empresa o estudio profesional.",
      address: "Florida 350, Microcentro",
      neighborhood: "Microcentro",
      price: 85000000,
      currency: "ARS",
      type: "OFICINA",
      status: "ALQUILADO",
      rooms: 1,
      bathrooms: 1,
      area: 65,
      amenities: ["Aire acondicionado", "Recepción"],
      photos: ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"],
    },
    {
      title: "Casona en Belgrano R",
      description: "Casona señorial con jardín, pileta y quincho. Una joya de la arquitectura porteña.",
      address: "Echeverría 3200, Belgrano",
      neighborhood: "Belgrano",
      price: 420000000,
      currency: "ARS",
      type: "CASA",
      status: "RESERVADO",
      rooms: 5,
      bathrooms: 4,
      area: 350,
      amenities: ["Jardín", "Pileta", "Cochera x2", "Quincho"],
      photos: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop"],
    },
    {
      title: "Monoambiente en Núñez",
      description: "Ideal para inversión. A 3 cuadras del subte. Excelente renta.",
      address: "Cabildo 4100, Núñez",
      neighborhood: "Núñez",
      price: 62000000,
      currency: "ARS",
      type: "DEPTO",
      status: "VENDIDO",
      rooms: 1,
      bathrooms: 1,
      area: 38,
      amenities: ["Balcón", "Laundry"],
      photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop"],
    },
    {
      title: "PH en Villa Crespo",
      description: "PH luminoso con terraza propia y parrilla. Sin expensas, sin sorpresas.",
      address: "Thames 600, Villa Crespo",
      neighborhood: "Villa Crespo",
      price: 175000000,
      currency: "ARS",
      type: "PH",
      status: "DISPONIBLE",
      rooms: 3,
      bathrooms: 2,
      area: 140,
      amenities: ["Terraza", "Parrilla", "Sin expensas"],
      photos: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop"],
    },
    {
      title: "Local en San Telmo",
      description: "Local a la calle en zona de alto tránsito. Excelente para gastronomía o comercio.",
      address: "Defensa 900, San Telmo",
      neighborhood: "San Telmo",
      price: 120000000,
      currency: "ARS",
      type: "LOCAL",
      status: "DISPONIBLE",
      rooms: 1,
      bathrooms: 1,
      area: 90,
      amenities: ["Vidriera", "Depósito"],
      photos: ["https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop"],
    },
    {
      title: "Departamento en Puerto Madero",
      description: "Piso alto con vista al río y amenities premium. El lujo al máximo.",
      address: "Olga Cossettini 1200, Puerto Madero",
      neighborhood: "Puerto Madero",
      price: 650000000,
      currency: "ARS",
      type: "DEPTO",
      status: "RESERVADO",
      rooms: 3,
      bathrooms: 3,
      area: 180,
      amenities: ["Pileta", "Gym", "Sauna", "Seguridad 24hs", "Cochera"],
      photos: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop"],
    },
  ];

  const properties = await Promise.all(
    propertyData.map((p) =>
      prisma.property.create({
        data: { ...p, agentId: agent.id },
      })
    )
  );

  console.log(`✓ ${properties.length} properties created`);

  // ─── Leads ────────────────────────────────────────────────────────────────────
  const leadData: Array<{
    name: string;
    email: string;
    phone: string;
    budget: number;
    budgetCurrency: Currency;
    source: LeadSource;
    stage: LeadStage;
    propertyIndex: number;
  }> = [
    { name: "Martín González", email: "martin.g@email.com", phone: "+54 11 5555-0101", budget: 280000000, budgetCurrency: "ARS", source: "WEB", stage: "VISITA_AGENDADA", propertyIndex: 0 },
    { name: "Carolina López", email: "caro.lopez@email.com", phone: "+54 11 5555-0202", budget: 200000000, budgetCurrency: "ARS", source: "REFERIDO", stage: "CONTACTADO", propertyIndex: 1 },
    { name: "Roberto Fernández", email: "r.fernandez@email.com", phone: "+54 11 5555-0303", budget: 90000000, budgetCurrency: "ARS", source: "PORTAL", stage: "OFERTA_REALIZADA", propertyIndex: 2 },
    { name: "Ana María Ruiz", email: "ana.ruiz@email.com", phone: "+54 11 5555-0404", budget: 430000000, budgetCurrency: "ARS", source: "WHATSAPP", stage: "NUEVO", propertyIndex: 3 },
    { name: "Diego Martínez", email: "diego.m@email.com", phone: "+54 11 5555-0505", budget: 175000000, budgetCurrency: "ARS", source: "WEB", stage: "CERRADO_GANADO", propertyIndex: 5 },
    { name: "Lucía Herrera", email: "lucia.h@email.com", phone: "+54 11 5555-0606", budget: 65000000, budgetCurrency: "ARS", source: "PORTAL", stage: "CERRADO_PERDIDO", propertyIndex: 4 },
    { name: "Federico Álvarez", email: "fede.a@email.com", phone: "+54 11 5555-0707", budget: 650000000, budgetCurrency: "ARS", source: "REFERIDO", stage: "VISITA_AGENDADA", propertyIndex: 7 },
    { name: "Sofía Peralta", email: "sofia.p@email.com", phone: "+54 11 5555-0808", budget: 120000000, budgetCurrency: "ARS", source: "WHATSAPP", stage: "CONTACTADO", propertyIndex: 6 },
    { name: "Pablo Ríos", email: "pablo.r@email.com", phone: "+54 11 5555-0909", budget: 300000000, budgetCurrency: "ARS", source: "WEB", stage: "NUEVO", propertyIndex: 0 },
    { name: "Valentina Cruz", email: "vale.c@email.com", phone: "+54 11 5555-1010", budget: 180000000, budgetCurrency: "ARS", source: "PORTAL", stage: "CONTACTADO", propertyIndex: 1 },
    { name: "Gustavo Méndez", email: "gus.m@email.com", phone: "+54 11 5555-1111", budget: 500000000, budgetCurrency: "ARS", source: "REFERIDO", stage: "NUEVO", propertyIndex: 7 },
    { name: "Natalia Vega", email: "nati.v@email.com", phone: "+54 11 5555-1212", budget: 150000000, budgetCurrency: "ARS", source: "WHATSAPP", stage: "OFERTA_REALIZADA", propertyIndex: 5 },
  ];

  const leads = await Promise.all(
    leadData.map((l) => {
      const { propertyIndex, ...rest } = l;
      return prisma.lead.create({
        data: {
          ...rest,
          agentId: agent.id,
          interestedProperties: {
            connect: [{ id: properties[propertyIndex].id }],
          },
        },
      });
    })
  );

  console.log(`✓ ${leads.length} leads created`);

  // ─── Notes ────────────────────────────────────────────────────────────────────
  const notesData = [
    { leadIndex: 0, content: "Consulta inicial por formulario web. Interesado en 4 ambientes en Palermo." },
    { leadIndex: 0, content: "Llamada de seguimiento. Confirmó que tiene financiación propia. Agendamos visita." },
    { leadIndex: 1, content: "Referida por Diego Martínez. Busca 3 ambientes con vista, preferiblemente Recoleta o Palermo." },
    { leadIndex: 1, content: "Primera llamada. Muy interesada, pidió fotos adicionales." },
    { leadIndex: 2, content: "Contacto por ZonaProp. Necesita oficina para su estudio contable." },
    { leadIndex: 2, content: "Visita realizada. Le gustó mucho. Presentó oferta por $82M ARS." },
    { leadIndex: 3, content: "Mensaje de WhatsApp. Pregunta por la casona de Belgrano." },
    { leadIndex: 6, content: "Referido de cliente anterior. Busca premium con amenities." },
    { leadIndex: 7, content: "Busca local para abrir un restaurante de cocina italiana." },
  ];

  await Promise.all(
    notesData.map((n) =>
      prisma.note.create({
        data: {
          content: n.content,
          leadId: leads[n.leadIndex].id,
          authorId: agent.id,
        },
      })
    )
  );

  console.log(`✓ Notes created`);

  // ─── Visits (next 7 days) ─────────────────────────────────────────────────────
  const today = startOfDay(new Date());

  const visitData: Array<{
    leadIndex: number;
    propertyIndex: number;
    daysFromNow: number;
    hour: number;
    type: VisitType;
  }> = [
    { leadIndex: 0, propertyIndex: 0, daysFromNow: 2, hour: 10, type: "PRESENCIAL" },
    { leadIndex: 6, propertyIndex: 7, daysFromNow: 3, hour: 15, type: "PRESENCIAL" },
    { leadIndex: 1, propertyIndex: 1, daysFromNow: 4, hour: 11, type: "VIRTUAL" },
    { leadIndex: 7, propertyIndex: 6, daysFromNow: 5, hour: 16, type: "PRESENCIAL" },
    { leadIndex: 3, propertyIndex: 3, daysFromNow: 6, hour: 9, type: "PRESENCIAL" },
    { leadIndex: 9, propertyIndex: 1, daysFromNow: 1, hour: 14, type: "PRESENCIAL" },
  ];

  await Promise.all(
    visitData.map((v) =>
      prisma.visit.create({
        data: {
          leadId: leads[v.leadIndex].id,
          propertyId: properties[v.propertyIndex].id,
          agentId: agent.id,
          scheduledAt: addHours(addDays(today, v.daysFromNow), v.hour),
          type: v.type,
          status: "PENDIENTE",
        },
      })
    )
  );

  console.log(`✓ ${visitData.length} visits scheduled`);

  // ─── Portal sync records ──────────────────────────────────────────────────────
  await Promise.all(
    properties.slice(0, 3).flatMap((p) =>
      ["ZONAPROP", "ARGENPROP"].map((portal) =>
        prisma.portalSync.upsert({
          where: { propertyId_portal: { propertyId: p.id, portal: portal as never } },
          create: {
            propertyId: p.id,
            portal: portal as never,
            externalId: `${portal.toLowerCase()}-${p.id}`,
            lastSyncedAt: new Date(),
            status: "SUCCESS",
          },
          update: {},
        })
      )
    )
  );

  console.log("✓ Portal sync records created");
  console.log("\n🎉 Seed complete!");
  console.log("   Login: agente@inmogestion.com / demo1234");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
