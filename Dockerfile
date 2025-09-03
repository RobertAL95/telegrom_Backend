# Imagen base oficial de Node.js (mejor usar LTS para estabilidad)
FROM node:20

# Crear y usar el directorio de la app
WORKDIR /app

# Copiar package.json y package-lock.json primero
COPY package*.json ./

# Instalar dependencias (asegura compilación en Linux)
RUN npm install

# (Opcional) Recompilar bcrypt desde cero para evitar binarios incompatibles
RUN npm rebuild bcrypt --build-from-source

# Copiar el resto del código
COPY . .

# Exponer el puerto que usa Express
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
