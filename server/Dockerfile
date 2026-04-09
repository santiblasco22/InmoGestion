# ── Etapa 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar openssl (requerido por Prisma)
RUN apk add --no-cache openssl

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma Client ANTES de compilar (genera los tipos TypeScript)
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# ── Etapa 2: Producción ────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Instalar openssl (requerido por Prisma en runtime)
RUN apk add --no-cache openssl

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
