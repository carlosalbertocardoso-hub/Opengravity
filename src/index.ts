import http from 'http';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

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
    console.log(`🎯 [dns.lookup PATCH] api.telegram.org -> ${ip}`);
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
console.log(`🔗 Webhook URL will be: ${WEBHOOK_URL}`);

try {
  console.log('🌌 Loading bot modules...');
  const { handleWebhook } = await import('./bot/index.js');
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing!');
  }
  
  const tokenPrefix = process.env.TELEGRAM_BOT_TOKEN.substring(0, 5);
  console.log(`🔑 Bot using token starting with: ${tokenPrefix}***`);

  // Create HTTP server that handles both health checks AND webhook callbacks
  const server = http.createServer(async (req, res) => {
    // Webhook endpoint - Telegram sends updates here
    if (req.url === WEBHOOK_PATH && req.method === 'POST') {
      console.log('📨 Received webhook update from Telegram');
      try {
        await handleWebhook(req, res);
      } catch (e) {
        console.error('❌ Webhook handler error:', e);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      }
      return;
    }

    // Health check / status endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      mode: 'webhook',
      webhook_url: WEBHOOK_URL,
      set_webhook_link: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}&drop_pending_updates=true`,
      message: 'OpenGravity is running in webhook mode! Visit the set_webhook_link in your browser to activate.'
    }, null, 2));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Webhook server listening on port ${PORT}`);
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🚀 WEBHOOK MODE ACTIVE                                     ║');
    console.log('║                                                              ║');
    console.log('║  To activate the bot, visit this URL in your browser:        ║');
    console.log('║  (Copy the set_webhook_link from the JSON status page)       ║');
    console.log('║                                                              ║');
    console.log(`║  Or visit: https://${SPACE_HOST}                      ║`);
    console.log('║  and copy the set_webhook_link URL.                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
  });

} catch (error) {
  console.error('💥 CRITICAL ERROR during startup:', error);
  
  // Still start a basic health check server so HF doesn't kill the Space
  const fallbackServer = http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`OpenGravity startup failed: ${error}\n`);
  });
  fallbackServer.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Fallback health server listening on port ${PORT}`);
  });
  
  setTimeout(() => process.exit(1), 5000);
}
