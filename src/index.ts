import http from 'http';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

// Try to force Google DNS if local resolution fails
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  console.log('📡 DNS servers set to: 8.8.8.8, 8.8.4.4, 1.1.1.1');
} catch (e) {
  console.warn('⚠️ Could not set DNS servers manually:', e);
}

// Hugging Face Spaces requires a server listening on port 7860
const PORT = Number(process.env.PORT) || 7860;
console.log(`🎬 Initializing OpenGravity Health Server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OpenGravity is running!\n');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Health check server listening on port ${PORT}`);
});

try {
  console.log('🌐 Running network diagnostics...');
  const domains = ['api.telegram.org', 'google.com', 'huggingface.co'];
  for (const domain of domains) {
    try {
      const { address } = await lookup(domain);
      console.log(`✅ DNS Lookup success: ${domain} -> ${address}`);
    } catch (dnsError: any) {
      console.error(`❌ DNS Lookup FAILED for ${domain}:`, dnsError.message);
    }
  }

  console.log('🌌 Loading bot modules...');
  const { startBot } = await import('./bot/index.js');
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is missing!');
  }
  
  const tokenPrefix = process.env.TELEGRAM_BOT_TOKEN.substring(0, 5);
  console.log(`🔑 Bot using token starting with: ${tokenPrefix}***`);
  
  await startBot();
} catch (error) {
  console.error('💥 CRITICAL ERROR during startup:', error);
  // No salimos inmediatamente para dejar que los logs se envíen
  setTimeout(() => process.exit(1), 1000);
}
