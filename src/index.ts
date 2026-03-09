import http from 'http';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

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
  try {
    const { address } = await lookup('api.telegram.org');
    console.log(`✅ DNS Lookup success: api.telegram.org -> ${address}`);
  } catch (dnsError) {
    console.error('❌ DNS Lookup FAILED for api.telegram.org:', dnsError);
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
