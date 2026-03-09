import http from 'http';
import dns from 'dns';

// MONKEY-PATCH DNS LOOKUP: Force api.telegram.org to its known static IP.
// Hugging Face blocks DNS resolution for Telegram domains.
const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = (...args: any[]) => {
  const hostname = args[0];
  const options = args.length > 2 ? args[1] : (typeof args[1] === 'object' ? args[1] : {});
  const callback = args[args.length - 1];

  if (hostname === 'api.telegram.org') {
    const ip = '149.154.167.220';
    if (options.all) {
      return callback(null, [{ address: ip, family: 4 }]);
    }
    return callback(null, ip, 4);
  }
  
  return (originalLookup as any)(...args);
};

// Hugging Face Spaces requires a server listening on port 7860
const PORT = Number(process.env.PORT) || 7860;
const SPACE_HOST = process.env.SPACE_HOST || 'ccardoso19-opengravity.hf.space';
const WEBHOOK_PATH = '/webhook';
const WEBHOOK_URL = `https://${SPACE_HOST}${WEBHOOK_PATH}`;

console.log(`🎬 Initializing OpenGravity Webhook Server on port ${PORT}...`);
console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);

// Dynamically import config and agent
const { config } = await import('./config.js');
const { Agent } = await import('./agent/index.js');

const tokenPrefix = config.TELEGRAM_BOT_TOKEN.substring(0, 5);
console.log(`🔑 Bot using token starting with: ${tokenPrefix}***`);
console.log(`👤 Allowed user IDs: [${config.TELEGRAM_ALLOWED_USER_IDS.join(', ')}]`);

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // === WEBHOOK ENDPOINT ===
  if (req.url === WEBHOOK_PATH && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        const message = update.message;

        // Ignore non-message updates
        if (!message || !message.from) {
          console.log('📨 Received non-message update, acknowledging.');
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('ok');
          return;
        }

        const userId = message.from.id.toString();
        const chatId = message.chat.id;
        const text = message.text || '';

        console.log(`📨 Webhook update: message from [${userId}] in chat [${chatId}]`);
        console.log(`💬 Text: "${text}"`);

        // Whitelist check
        if (!config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
          console.warn(`🚫 UNAUTHORIZED: User [${userId}] not in whitelist.`);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('ok');
          return;
        }
        console.log(`✅ User [${userId}] authorized.`);

        // Handle /start command
        if (text === '/start') {
          console.log('🎬 /start command received');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            method: 'sendMessage',
            chat_id: chatId,
            text: '🚀 OpenGravity operativo. ¿En qué puedo ayudarte?'
          }));
          return;
        }

        // Handle /help command
        if (text === '/help') {
          console.log('❓ /help command received');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            method: 'sendMessage',
            chat_id: chatId,
            text: 'Soy tu agente personal. Puedes hablar conmigo normalmente.'
          }));
          return;
        }

        // Process with AI Agent
        if (!text) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('ok');
          return;
        }

        console.log(`🧠 Invoking Agent for user ${userId}...`);
        const agent = new Agent(userId);
        const response = await agent.chat(text);
        console.log(`📤 Agent response generated. Sending via webhook reply...`);

        // Send reply via the webhook HTTP response body.
        // Telegram executes this as an API call - NO outbound HTTPS needed!
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          method: 'sendMessage',
          chat_id: chatId,
          text: response || 'No he podido generar una respuesta.',
          parse_mode: 'Markdown'
        }));
        console.log(`✨ Response sent via webhook reply!`);

      } catch (error: any) {
        console.error('❌ Error processing webhook:', error.message || error);
        // Always respond 200 to Telegram to prevent retries
        if (!res.headersSent) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            method: 'sendMessage',
            chat_id: JSON.parse(body)?.message?.chat?.id,
            text: '⚠️ Error procesando tu mensaje. Inténtalo de nuevo.'
          }));
        }
      }
    });
    return;
  }

  // === HEALTH CHECK / STATUS ENDPOINT ===
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
    mode: 'webhook',
    webhook_url: WEBHOOK_URL,
    set_webhook_link: `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}&drop_pending_updates=true`,
  }, null, 2));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Webhook server listening on port ${PORT}`);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 WEBHOOK MODE ACTIVE - NO OUTBOUND HTTPS NEEDED         ║');
  console.log('║                                                              ║');
  console.log('║  Activate the bot by visiting this URL in your browser:      ║');
  console.log(`║  https://${SPACE_HOST}                                       ║`);
  console.log('║  Then copy the set_webhook_link from the JSON response.      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
