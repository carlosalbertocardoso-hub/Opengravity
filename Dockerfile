# Usar una imagen ligera de Node.js
FROM node:20-slim

# Crear directorio de la app
WORKDIR /app

# Instalar TODAS las dependencias (incluyendo devDependencies para tsc)
COPY package*.json ./
RUN npm install --include=dev

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JavaScript usando el script del package.json
RUN npm run build

# Hugging Face requiere permisos específicos para el usuario 1000
RUN chown -R 1000:1000 /app
USER 1000

# Exponer el puerto que requiere Hugging Face
EXPOSE 7860

# Comando para iniciar el bot
CMD ["npm", "start"]
