# ── Etapa 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código y compilar TypeScript
COPY . .
RUN npm run build

# Generar Prisma Client
RUN npx prisma generate

# ── Etapa 2: Producción ────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar el build compilado
COPY --from=builder /app/dist ./dist

# Copiar Prisma (necesita el schema y el client generado)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/index.js"]
