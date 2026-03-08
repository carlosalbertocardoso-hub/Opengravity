import { Bot, GrammyError, HttpError } from 'grammy';
import { config } from '../config.js';
import { Agent } from '../agent/index.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Whitelist Middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  console.log(`📩 Message received from ID: ${userId}`);
  
  if (!userId) {
    console.warn("⚠️ Message received without userId");
    return;
  }

  // Debug whitelist
  console.log(`🔐 Checking whitelist. Allowed: [${config.TELEGRAM_ALLOWED_USER_IDS.join(', ')}]`);
  
  if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.warn(`🚫 Unauthorized access attempt from ID: ${userId}. Not in whitelist.`);
    return;
  }
  
  console.log(`✅ User ${userId} authorized.`);
  await next();
});

// Command Handlers
bot.command('start', (ctx) => {
  console.log('🎬 /start command received');
  return ctx.reply('🚀 OpenGravity operativo. ¿En qué puedo ayudarte?');
});

bot.command('help', (ctx) => {
  console.log('❓ /help command received');
  return ctx.reply('Soy tu agente personal local. Puedes hablar conmigo normalmente.');
});

// Message Handler
bot.on('message:text', async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;
  console.log(`💬 Processing text message from ${userId}: "${text}"`);

  // Show typing status
  await ctx.replyWithChatAction('typing').catch(e => console.error('Error sending chat action:', e));

  try {
    console.log(`🧠 Invoking Agent for user ${userId}...`);
    const agent = new Agent(userId);
    const response = await agent.chat(text);
    console.log(`📤 Agent response generated. Sending to Telegram...`);
    await ctx.reply(response || "No he podido generar una respuesta.");
    console.log(`✨ Response sent successfully.`);
  } catch (error: any) {
    console.error('❌ Error del Agente:', error);
    if (error.response?.data) {
      console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    await ctx.reply('⚠️ Hubo un error al procesar tu mensaje. Revisa la terminal para más detalles.').catch(e => console.error('Error sending error reply:', e));
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
