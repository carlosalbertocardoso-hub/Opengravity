# Usar una imagen ligera de Node.js
FROM node:20-slim

# Crear directorio de la app
WORKDIR /app

# Instalar dependencias necesarias para compilar y ejecutar
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JavaScript
RUN npx tsc

# Hugging Face corre como usuario no root (1000)
RUN chown -R 1000:1000 /app
USER 1000

# Exponer el puerto que requiere Hugging Face
EXPOSE 7860

# Comando para iniciar el bot
CMD ["npm", "start"]
