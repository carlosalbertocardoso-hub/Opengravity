import { Bot, GrammyError, HttpError, webhookCallback } from 'grammy';
import { config } from '../config.js';
import { Agent } from '../agent/index.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Whitelist Middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  console.log(`📩 Message received from ID: [${userId}]`);
  
  if (!userId) {
    console.warn("⚠️ Update received without userId (maybe a system update)");
    return;
  }

  // Debug whitelist
  console.log(`🔐 Checking whitelist... User ID: [${userId}] | Allowed: [${config.TELEGRAM_ALLOWED_USER_IDS.join(', ')}]`);
  
  if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.warn(`🚫 UNAUTHORIZED: ID [${userId}] is NOT in whitelist.`);
    return;
  }
  
  console.log(`✅ User [${userId}] authorized. Processing message...`);
  await next();
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

  // NOTE: We skip replyWithChatAction('typing') in webhook mode
  // because only ONE API call can go through the webhook response,
  // and we want that to be the actual reply to the user.

  try {
    console.log(`🧠 Invoking Agent for user ${userId}...`);
    const agent = new Agent(userId);
    const response = await agent.chat(text);
    console.log(`📤 Agent response generated. Sending via webhook reply...`);
    await ctx.reply(response || "No he podido generar una respuesta.");
    console.log(`✨ Response sent successfully.`);
  } catch (error: any) {
    console.error('❌ Error del Agente:', error);
    if (error.response?.data) {
      console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    await ctx.reply('⚠️ Hubo un error al procesar tu mensaje.').catch(e => console.error('Error sending error reply:', e));
  }
});

// Export webhook callback handler for HTTP server
// Grammy's webhookCallback automatically sends the FIRST API call per update
// as the HTTP response body, avoiding outbound HTTPS calls entirely!
export const handleWebhook = webhookCallback(bot, 'http');
