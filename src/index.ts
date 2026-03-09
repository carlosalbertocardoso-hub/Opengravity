import http from 'http';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);

// MONKEY-PATCH DNS LOOKUP: If api.telegram.org fails, we force its known static IP.
// This is necessary because Hugging Face networks sometimes have intermittent DNS resolution for specific domains.
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

// Now create the promisified version of the PATCHED lookup
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
      const result = await lookup(domain);
      const address = typeof result === 'string' ? result : (result as any).address;
      console.log(`✅ [lookup] success: ${domain} -> ${address}`);
    } catch (dnsError: any) {
      console.error(`❌ [lookup] FAILED for ${domain}:`, dnsError.message);
      
      // Try resolve4 as a fallback
      try {
        const addresses = await resolve4(domain);
        console.log(`✅ [resolve4] success: ${domain} -> ${addresses[0]}`);
      } catch (resolveError: any) {
        console.error(`❌ [resolve4] ALSO FAILED for ${domain}:`, resolveError.message);
      }
    }
  }

  // Test if fetch (which grammy uses) respects the patch
  console.log('🧪 Testing fetch() connectivity to Telegram...');
  try {
    const response = await fetch('https://api.telegram.org', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    console.log(`✅ fetch() success: Status ${response.status}`);
  } catch (fetchErr: any) {
    console.error(`❌ fetch() FAILED: ${fetchErr.message}`);
  }

  // Direct IP connectivity diagnostic
  console.log('🔌 Testing direct connection to Telegram IP (149.154.167.220)...');
  try {
    const res = await new Promise((resolve, reject) => {
      const req = http.get('http://149.154.167.220', { timeout: 5000 }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    console.log(`✅ Direct IP connection status: ${res}`);
  } catch (err: any) {
    console.error(`❌ Direct IP connection FAILED: ${err.message}`);
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
