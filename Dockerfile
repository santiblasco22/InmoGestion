# ── Etapa 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias primero (aprovecha cache de Docker)
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Variables de entorno necesarias en tiempo de build (Vite las bake en el JS)
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Compilar la app
RUN npm run build

# ── Etapa 2: Serve con nginx ───────────────────────────────────────────────────
FROM nginx:alpine

# Copiar el build al servidor web
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx (maneja rutas SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
