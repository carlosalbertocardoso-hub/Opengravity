# OpenGravity 🌌

Tu agente de IA personal local, seguro y modular.

## Requisitos

- **Node.js**: v20+ recomendado.
- **API Keys**: Groq (principal) y OpenRouter (opcional).
- **Telegram Bot**: Crea uno con [@BotFather](https://t.me/botfather).

## Configuración

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Rellena las variables en `.env`:
   - `TELEGRAM_BOT_TOKEN`: El token que te dio BotFather.
   - `TELEGRAM_ALLOWED_USER_IDS`: Tu ID de Telegram (puedes obtenerlo de [@userinfobot](https://t.me/userinfobot)).
   - `GROQ_API_KEY`: Tu clave de Groq Cloud.

## Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

## Estructura

- `src/index.ts`: Punto de entrada.
- `src/bot/`: Lógica del bot de Telegram (grammy).
- `src/agent/`: Bucle de pensamiento y acción del agente.
- `src/tools/`: Herramientas ejecutables (get_current_time).
- `src/db/index.ts`: Persistencia con Firestore (con fallback local).
- `src/config.ts`: Validación de entorno.

## Base de Datos en la Nube (Firebase)

Para habilitar la persistencia en la nube:
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Firestore Database**.
3. Ve a **Configuración del proyecto > Cuentas de servicio** y genera una nueva clave privada JSON.
4. Guarda el archivo `.json` en el directorio raíz de OpenGravity.
5. Actualiza tu `.env` con la ruta al archivo:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS="./tu-archivo-servicio.json"
   ```
   *Nota: Si no se configura, el agente usará automáticamente `memory.json` local.*
