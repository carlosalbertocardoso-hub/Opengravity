import http from 'http';

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
  console.log('🌌 Loading bot modules...');
  const { startBot } = await import('./bot/index.js');
  
  console.log('🤖 Starting Telegram Bot...');
  await startBot();
} catch (error) {
  console.error('💥 CRITICAL ERROR during startup:', error);
  // No salimos inmediatamente para dejar que los logs se envíen
  setTimeout(() => process.exit(1), 1000);
}
