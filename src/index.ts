import http from 'http';

// Hugging Face Spaces requires a server listening on port 7860
// Iniciamos el servidor de salud lo primero de todo para evitar errores de timeout
const PORT = Number(process.env.PORT) || 7860;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OpenGravity is running!\n');
}).listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Health check server listening on port ${PORT}`);
});

// Importamos el bot después para que el servidor de salud ya esté arriba
const { startBot } = await import('./bot/index.js');

console.log('🌌 OpenGravity is waking up...');

try {
  await startBot();
} catch (error) {
  console.error('💥 Failed to start OpenGravity:', error);
  process.exit(1);
}
