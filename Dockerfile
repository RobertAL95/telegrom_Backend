# ======================================================
# 🧱 Etapa 1: Builder
# ======================================================
FROM node:20-alpine AS builder

# Mejor rendimiento de npm en entornos limitados
ENV NODE_ENV=development

WORKDIR /app

# 👇 1. INSTALAR HERRAMIENTAS DE COMPILACIÓN (Necesario para bcrypt y sharp)
RUN apk add --no-cache python3 make g++

# Copiamos solo lo necesario para instalar dependencias
COPY package*.json ./

# Instala dependencias (usa cache de Docker)
RUN npm install --legacy-peer-deps

# Recompilar bcrypt si lo usas (esto ahora funcionará mejor gracias a las herramientas de arriba)
RUN npm rebuild bcrypt --build-from-source || echo "bcrypt rebuild skipped"

# Copiamos el resto del código fuente
COPY . .

# ======================================================
# 🚀 Etapa 2: Runner
# ======================================================
FROM node:20-alpine AS runner

# Entorno de ejecución
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

# 👇 2. INSTALAR FFMPEG (Necesario para comprimir video/audio)
# Esto instala el programa real que usa tu código "compressor.js"
RUN apk add --no-cache ffmpeg

# Copiamos solo lo esencial desde el builder
COPY --from=builder /app /app

# Instalar dependencias de producción solamente (limpieza)
RUN npm prune --production

# Crea un usuario no root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Exponer el puerto del backend
EXPOSE 4000

# Comando de inicio
CMD ["node", "server.js"]