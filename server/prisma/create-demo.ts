/**
 * Creates (or resets) the demo admin account.
 * Run with: npx tsx prisma/create-demo.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@inmogestion.com";
const DEMO_PASSWORD = "Inmo@2025Demo";
const DEMO_NAME = "Admin Demo";

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { password: hash, name: DEMO_NAME, role: "ADMIN" },
    create: { email: DEMO_EMAIL, password: hash, name: DEMO_NAME, role: "ADMIN" },
  });

  console.log("✓ Cuenta demo lista:");
  console.log(`  Email:      ${DEMO_EMAIL}`);
  console.log(`  Contraseña: ${DEMO_PASSWORD}`);
  console.log(`  Rol:        ${user.role}`);
  console.log(`  ID:         ${user.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
