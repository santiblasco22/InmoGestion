import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";
import { startDigestCron } from "./lib/digest";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  "https://inmo-gestion.vercel.app",
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:8083",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8083",
].filter(Boolean) as string[];
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      // allow any localhost in development
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // allow any vercel.app preview/production URL
      if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Static uploads (local dev fallback when R2 is not configured) ───────────
app.use("/uploads", express.static(path.join(__dirname, "../../public/uploads")));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", env: process.env.NODE_ENV });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { message: "Endpoint no encontrado", code: "NOT_FOUND" } });
});

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start ─────────────────────────────────────────────────────────────────────
async function bootstrap() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log("✓ Database connected");

  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV ?? "development"}`);
  });

  startDigestCron();
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
