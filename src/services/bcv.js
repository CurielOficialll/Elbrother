const https = require('https');
const { getDb } = require('../database/connection');

/**
 * Fetches the current BCV (Banco Central de Venezuela) exchange rate.
 * Returns Bs per USD. Falls back to cached rate if network is unavailable.
 */
async function fetchBCVRate() {
  try {
    const html = await httpGet('https://www.bcv.org.ve/');
    // Parse the USD rate from BCV page - format: <strong> 483,86950000 </strong>
    // The dollar section has id="dolar" and the rate is in the <strong> tag after it
    const match = html.match(/id="dolar"[\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
    if (match) {
      // BCV uses comma as decimal separator: "483,86950000"
      const rateStr = match[1].replace(/\./g, '').replace(',', '.');
      const rate = parseFloat(rateStr);
      if (rate > 0) {
        console.log(`[BCV] Tasa parseada exitosamente: ${rate} Bs/$`);
        return rate;
      }
    }
    // Fallback: try to find any strong with large decimal number (likely Bs rate)
    const strongMatches = html.match(/<strong>\s*([\d.,]+)\s*<\/strong>/g);
    if (strongMatches) {
      for (const s of strongMatches) {
        const numMatch = s.match(/([\d.,]+)/);
        if (numMatch) {
          const val = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
          if (val > 10) { // BCV rate should be > 10 Bs
            console.log(`[BCV] Tasa fallback: ${val} Bs/$`);
            return val;
          }
        }
      }
    }
    throw new Error('Could not parse BCV rate from HTML');
  } catch (e) {
    console.log('[BCV] Fetch failed, using cached rate:', e.message);
    return getCachedRate();
  }
}

function getCachedRate() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT rate FROM bcv_rates ORDER BY fetched_at DESC LIMIT 1').get();
    return row ? row.rate : null;
  } catch {
    return null;
  }
}

function getCurrentRate() {
  try {
    const db = getDb();
    const config = db.prepare("SELECT value FROM system_config WHERE key = 'bcv_rate'").get();
    return config ? parseFloat(config.value) : 36.50;
  } catch {
    return 36.50;
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
    const req = https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'es-VE,es;q=0.9'
      },
      rejectUnauthorized: false
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeout);
        httpGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { clearTimeout(timeout); resolve(data); });
    });
    req.on('error', (e) => { clearTimeout(timeout); reject(e); });
  });
}

module.exports = { fetchBCVRate, getCachedRate, getCurrentRate };
