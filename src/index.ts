import { startBot } from './bot/index.js';

console.log('🌌 OpenGravity is waking up...');

try {
  await startBot();
} catch (error) {
  console.error('💥 Failed to start OpenGravity:', error);
  process.exit(1);
}
