const https = require('https');
const http = require('http');
const { getDb } = require('../database/connection');

/**
 * Fetches the current BCV (Banco Central de Venezuela) exchange rate.
 * Returns Bs per USD. Uses multiple sources with fallback chain:
 *   1. DolarVZLA API (CDN, fastest & most reliable)
 *   2. ve.dolarapi.com API (alternative)
 *   3. Direct BCV website scraping (original method)
 *   4. Cached rate from database
 */
async function fetchBCVRate() {
  // 1) Try DolarVZLA API first (fastest, no rate limit, JSON)
  try {
    const data = await httpGetJSON('https://rates.dolarvzla.com/bcv/current.json', 8000);
    // Handle both old format (data.USD) and new format (data.current.usd)
    let rate = 0;
    if (data && data.current && data.current.usd) {
      rate = parseFloat(data.current.usd);
    } else if (data && data.USD) {
      rate = parseFloat(data.USD);
    }
    if (rate > 0) {
      console.log(`[BCV] Tasa desde DolarVZLA API: ${rate} Bs/$`);
      return rate;
    }
  } catch (e) {
    console.log('[BCV] DolarVZLA API no disponible:', e.message);
  }

  // 2) Try ve.dolarapi.com
  try {
    const data = await httpGetJSON('https://ve.dolarapi.com/v1/dolares/oficial', 8000);
    if (data && data.promedio) {
      const rate = parseFloat(data.promedio);
      if (rate > 0) {
        console.log(`[BCV] Tasa desde DolarAPI: ${rate} Bs/$`);
        return rate;
      }
    }
  } catch (e) {
    console.log('[BCV] DolarAPI no disponible:', e.message);
  }

  // 3) Fallback: scrape BCV website directly
  try {
    const rate = await scrapeBCV();
    if (rate && rate > 0) {
      return rate;
    }
  } catch (e) {
    console.log('[BCV] Scraping BCV falló:', e.message);
  }

  // 4) Last resort: cached rate from database
  console.log('[BCV] Todas las fuentes fallaron, usando caché');
  return getCachedRate();
}

/**
 * Scrape the BCV website directly for the USD rate.
 * This is less reliable than APIs because the HTML structure changes.
 */
async function scrapeBCV() {
  const html = await httpGet('https://www.bcv.org.ve/', 12000);
  
  // Primary: Look for the USD section (id="dolar") and its <strong> tag
  // The BCV page structure: <div id="dolar">...<strong> XX,XXXXXXXX </strong>
  const dolarMatch = html.match(/id\s*=\s*["']dolar["'][\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
  if (dolarMatch) {
    const rate = parseBCVNumber(dolarMatch[1]);
    if (rate > 0) {
      console.log(`[BCV] Tasa scrapeada (id=dolar): ${rate} Bs/$`);
      return rate;
    }
  }

  // Secondary: Look for the section with "Dólar" text and the rate near it
  const dolarSectionMatch = html.match(/[Dd][oó]lar[\s\S]{0,200}?<strong>\s*([\d.,]+)\s*<\/strong>/);
  if (dolarSectionMatch) {
    const rate = parseBCVNumber(dolarSectionMatch[1]);
    if (rate > 0) {
      console.log(`[BCV] Tasa scrapeada (sección Dólar): ${rate} Bs/$`);
      return rate;
    }
  }

  throw new Error('No se pudo parsear la tasa del BCV');
}

/**
 * Parse a BCV-formatted number string to a float.
 * BCV format uses dots for thousands and comma for decimal:
 * "1.234,56789000" → 1234.56789
 */
function parseBCVNumber(str) {
  if (!str) return 0;
  // Remove thousands dots, replace decimal comma with dot
  const cleaned = str.trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function getCachedRate() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT rate FROM bcv_rates ORDER BY fetched_at DESC LIMIT 1').get();
    return row && row.rate > 0 ? row.rate : 567.68;
  } catch {
    return 567.68;
  }
}

function getCurrentRate() {
  try {
    const db = getDb();
    const config = db.prepare("SELECT value FROM system_config WHERE key = 'bcv_rate'").get();
    if (config) {
      const rate = parseFloat(config.value);
      if (rate > 0) return rate;
    }
    // Try bcv_rates table as additional fallback
    const row = db.prepare('SELECT rate FROM bcv_rates ORDER BY fetched_at DESC LIMIT 1').get();
    if (row && row.rate > 0) return row.rate;
    return 567.68;
  } catch {
    return 567.68;
  }
}

/**
 * HTTP GET that returns raw text (for HTML scraping)
 */
function httpGet(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { 
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
        httpGet(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { clearTimeout(timeout); resolve(data); });
    });
    req.on('error', (e) => { clearTimeout(timeout); reject(e); });
  });
}

/**
 * HTTP GET that parses JSON response (for API calls)
 */
function httpGetJSON(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'ElbrotherPOS/2.5',
        'Accept': 'application/json'
      },
      rejectUnauthorized: false
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeout);
        httpGetJSON(res.headers.location, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        clearTimeout(timeout);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('error', (e) => { clearTimeout(timeout); reject(e); });
  });
}

module.exports = { fetchBCVRate, getCachedRate, getCurrentRate };
