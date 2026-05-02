import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';
import https from 'https';
import { hasCloudflareIP } from './cloudflare.js';

const dnsLookup = promisify(dns.lookup);

const SKIP_PREFIXES = [
  '_dmarc.', '_domainkey.', '_bbcab.', '_6a24.', '_sip.',
  '_sipfed.', '_autodiscover.', 'mail._domainkey.',
  'k2._domainkey.', 'k3._domainkey.', 's1._domainkey.',
  's2._domainkey.', 'em2443.', 'selector1._domainkey.',
  'default._domainkey.', '230619', 'cf2024', 'frzr', 'wziut', 'p9up',
];

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function resolveDns(host) {
  try {
    const result = await dnsLookup(host);
    return [result.address];
  } catch {
    return [];
  }
}

async function checkHttp(host, scheme = 'https', timeout = 8000) {
  const url = `${scheme}://${host}`;
  try {
    const response = await axios.get(url, {
      timeout,
      maxRedirects: 3,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0',
      },
      httpsAgent,
    });
    return {
      code: response.status,
      url: response.request?.res?.responseUrl || response.config.url,
      headers: response.headers,
      error: null,
    };
  } catch (err) {
    return { code: null, url, headers: {}, error: err.message };
  }
}

async function checkTcp(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

function classifyStatus(httpCode, tcp443, tcp80, ips) {
  if (!ips || ips.length === 0) return { status: 'NO_DNS', icon: '⛔' };
  if ([200, 201, 301, 302, 303, 307, 308].includes(httpCode)) return { status: 'OPEN', icon: '✅' };
  if ([401, 403].includes(httpCode)) return { status: 'OPEN (Auth)', icon: '🔒' };
  if (httpCode && httpCode >= 400) return { status: 'OPEN (Error)', icon: '⚠️' };
  if (tcp443 || tcp80) return { status: 'TCP OPEN', icon: '🟡' };
  if (ips && ips.length > 0) return { status: 'DNS ONLY', icon: '🟠' };
  return { status: 'CLOSED', icon: '❌' };
}

// ── Shared Puppeteer browser ──────────────────────────────────
let _browser = null;
let _browserPromise = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;
  if (_browserPromise) return _browserPromise;

  _browserPromise = (async () => {
    try {
      const puppeteer = await import('puppeteer').catch(() => null);
      if (!puppeteer) return null;
      _browser = await puppeteer.default.launch({
        headless: 'new',
        args: [
          '--no-sandbox', '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', '--disable-gpu',
          '--ignore-certificate-errors', '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
        ],
        ignoreHTTPSErrors: true,
      });
      console.log('📸 Puppeteer browser launched');
      return _browser;
    } catch (err) {
      console.error('📸 Puppeteer failed:', err.message);
      return null;
    } finally {
      _browserPromise = null;
    }
  })();
  return _browserPromise;
}

async function takeScreenshot(url) {
  const browser = await getBrowser();
  if (!browser) return null;

  let page = null;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0');

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const t = req.resourceType();
      if (['font', 'media', 'websocket', 'manifest'].includes(t)) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await new Promise((r) => globalThis.setTimeout(r, 600));

    const buf = await page.screenshot({ type: 'jpeg', quality: 55, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  } finally {
    if (page) try { await page.close(); } catch {}
  }
}

// ── Scan a single host (fast — no screenshot) ─────────────────
async function scanHostFast(entry, timeout = 8000) {
  const { domain, host, is_subdomain: isSubdomain = false } = entry;
  const startTime = Date.now();

  // DNS
  const ips = await resolveDns(host);

  // HTTP + TCP in parallel
  const [httpResult, tcp443, tcp80] = await Promise.all([
    (async () => {
      let r = await checkHttp(host, 'https', timeout);
      if (r.code === null) {
        const fallback = await checkHttp(host, 'http', timeout);
        if (fallback.code !== null) return { ...fallback, scheme: 'http' };
      }
      return { ...r, scheme: 'https' };
    })(),
    checkTcp(host, 443, 3000),
    checkTcp(host, 80, 3000),
  ]);

  const { status, icon } = classifyStatus(httpResult.code, tcp443, tcp80, ips);

  // Cloudflare
  const isCloudflare = hasCloudflareIP(ips);
  const headers = httpResult.headers || {};
  const headerKeys = Object.keys(headers).map((k) => k.toLowerCase());
  const cfRay = headers['cf-ray'] || '';
  const cfCache = headers['cf-cache-status'] || '';
  const cloudflare = isCloudflare || !!(cfRay || cfCache);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  return {
    domain, host, is_subdomain: isSubdomain,
    dns_resolved: ips.length > 0, ips,
    http_code: httpResult.code, http_error: httpResult.error,
    final_url: httpResult.url, scheme: httpResult.scheme,
    tcp_443: tcp443, tcp_80: tcp80,
    status, status_icon: icon,
    server: headers['server'] || '',
    content_type: (headers['content-type'] || '').split(';')[0].trim(),
    x_powered_by: headers['x-powered-by'] || '',
    hsts: headerKeys.includes('strict-transport-security'),
    x_frame_options: headers['x-frame-options'] || '',
    x_content_type: headers['x-content-type-options'] || '',
    csp: headerKeys.includes('content-security-policy'),
    cloudflare, cf_ray: cfRay,
    whatweb: [],
    screenshot: null,
    scan_time_s: parseFloat(elapsed),
    scanned_at: new Date().toISOString(),
  };
}

// ── Concurrency helper ────────────────────────────────────────
async function runWithConcurrency(items, fn, concurrency) {
  const results = [];
  let idx = 0;

  const worker = async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ── Main scan function ────────────────────────────────────────
export async function scanMultipleHosts(entries, options = {}, progressCb = null) {
  const { workers = 12, timeout = 8000, screenshot = false } = options;

  // PHASE 1: Fast scan all hosts (DNS + HTTP + TCP)
  console.log(`⚡ Phase 1: Scanning ${entries.length} hosts with ${workers} workers...`);
  let scanned = 0;

  const results = await runWithConcurrency(entries, async (entry) => {
    const result = await scanHostFast(entry, timeout);
    scanned++;
    if (progressCb) progressCb({ phase: 'scan', scanned, total: entries.length });
    return result;
  }, workers);

  console.log(`✅ Phase 1 done: ${results.length} hosts scanned`);

  // PHASE 2: Screenshots (only for hosts with HTTP response, concurrency = 2)
  if (screenshot) {
    const screenshotTargets = results
      .map((r, i) => ({ result: r, index: i }))
      .filter(({ result }) => result.http_code && result.final_url);

    if (screenshotTargets.length > 0) {
      console.log(`📸 Phase 2: Taking ${screenshotTargets.length} screenshots (concurrency: 2)...`);
      let shotsDone = 0;

      await runWithConcurrency(screenshotTargets, async ({ result, index }) => {
        const shot = await takeScreenshot(result.final_url);
        if (shot) results[index].screenshot = shot;
        shotsDone++;
        if (progressCb) progressCb({ phase: 'screenshot', scanned: shotsDone, total: screenshotTargets.length });
      }, 2); // Max 2 concurrent screenshots

      console.log(`✅ Phase 2 done: screenshots captured`);
    }
  }

  // Sort by status priority
  const statusOrder = {
    OPEN: 0, 'OPEN (Auth)': 1, 'OPEN (Error)': 2,
    'TCP OPEN': 3, 'DNS ONLY': 4, CLOSED: 5, NO_DNS: 6,
  };

  results.sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || a.host.localeCompare(b.host)
  );

  return results;
}

// Keep backward compat export
export async function scanHost(entry, options = {}) {
  return scanHostFast(entry, options.timeout || 8000);
}

export function flattenDomains(data) {
  const entries = [];
  for (const item of data) {
    const domain = item.domain;
    entries.push({ domain, host: domain, is_subdomain: false });
    if (item.subdomains && Array.isArray(item.subdomains)) {
      for (const sub of item.subdomains) {
        if (!SKIP_PREFIXES.some((p) => sub.startsWith(p))) {
          entries.push({ domain, host: sub, is_subdomain: true });
        }
      }
    }
  }
  return entries;
}

export function calculateStats(results) {
  const counts = {};
  let screenshotCount = 0, openCount = 0, cloudflareCount = 0;

  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.screenshot) screenshotCount++;
    if (r.status.includes('OPEN')) openCount++;
    if (r.cloudflare) cloudflareCount++;
  }

  return {
    counts,
    total: results.length,
    open: openCount,
    closed: (counts['CLOSED'] || 0) + (counts['NO_DNS'] || 0),
    screenshots: screenshotCount,
    cloudflare: cloudflareCount,
  };
}
