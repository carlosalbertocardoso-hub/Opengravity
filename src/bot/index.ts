import { Bot, GrammyError, HttpError } from 'grammy';
import { config } from '../config.js';
import { Agent } from '../agent/index.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Whitelist Middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  if (!userId || !config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.warn(`🚫 Unauthorized access attempt from ID: ${userId}`);
    return;
  }
  await next();
});

// Command Handlers
bot.command('start', (ctx) => ctx.reply('🚀 OpenGravity operativo. ¿En qué puedo ayudarte?'));
bot.command('help', (ctx) => ctx.reply('Soy tu agente personal local. Puedes hablar conmigo normalmente.'));

// Message Handler
bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;

  // Show seasonal typing status
  await ctx.replyWithChatAction('typing');

  try {
    const agent = new Agent(userId);
    const response = await agent.chat(text);
    await ctx.reply(response || "No he podido generar una respuesta.");
  } catch (error: any) {
    console.error('❌ Error del Agente:', error);
    if (error.response?.data) {
      console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    await ctx.reply('⚠️ Hubo un error al procesar tu mensaje. Revisa la terminal para más detalles.');
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`❌ Error al manejar la actualización ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error en petición:", e.description);
  } else if (e instanceof HttpError) {
    console.error("No se pudo contactar con Telegram:", e);
  } else {
    console.error("Error desconocido:", e);
  }
});

export const startBot = async () => {
  console.log('🤖 Starting Telegram Bot (Long Polling)...');
  await bot.start();
};
