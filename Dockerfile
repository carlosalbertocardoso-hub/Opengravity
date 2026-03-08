# Usar una imagen ligera de Node.js
FROM node:20-slim

# Crear directorio de la app
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (solo producción para ser más ligero)
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JavaScript
RUN npx tsc

# Comando para iniciar el bot
CMD ["npm", "start"]
