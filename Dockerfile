# ======================================================
# 🧱 Etapa 1: Builder
# ======================================================
FROM node:20-alpine AS builder

# Mejor rendimiento de npm en entornos limitados
ENV NODE_ENV=development

WORKDIR /app

# Copiamos solo lo necesario para instalar dependencias
COPY package*.json ./

# Instala dependencias (usa cache de Docker)
RUN npm install --legacy-peer-deps

# Recompilar bcrypt si lo usas (según tu código)
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

# Copiamos solo lo esencial desde el builder
COPY --from=builder /app /app

# Instalar dependencias de producción solamente
RUN npm prune --production

# Crea un usuario no root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Exponer el puerto del backend
EXPOSE 4000

# Comando de inicio
CMD ["node", "server.js"]
