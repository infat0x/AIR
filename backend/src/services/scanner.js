import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const dnsLookup = promisify(dns.lookup);
const dnsResolveAll = promisify(dns.resolveAny);

const SKIP_PREFIXES = [
  '_dmarc.',
  '_domainkey.',
  '_bbcab.',
  '_6a24.',
  '_sip.',
  '_sipfed.',
  '_autodiscover.',
  'mail._domainkey.',
  'k2._domainkey.',
  'k3._domainkey.',
  's1._domainkey.',
  's2._domainkey.',
  'em2443.',
  'selector1._domainkey.',
  'default._domainkey.',
  '230619',
  'cf2024',
  'frzr',
  'wziut',
  'p9up',
];

async function resolveDns(host) {
  try {
    const result = await dnsLookup(host);
    return [result.address];
  } catch (err) {
    return [];
  }
}

async function checkHttp(host, scheme = 'https') {
  const url = `${scheme}://${host}`;
  const httpsAgent = {
    https: require('https').Agent({
      rejectUnauthorized: false,
    }),
  };

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0',
      },
      ...httpsAgent,
    });

    return {
      code: response.status,
      url: response.config.url,
      headers: response.headers,
      error: null,
    };
  } catch (err) {
    return {
      code: null,
      url,
      headers: {},
      error: err.message,
    };
  }
}

async function checkTcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(
      {
        host,
        port,
        timeout: 5000,
      },
      () => {
        socket.destroy();
        resolve(true);
      }
    );

    socket.on('error', () => {
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function classifyStatus(httpCode, tcp443, tcp80, ips) {
  if (!ips || ips.length === 0) {
    return { status: 'NO_DNS', icon: '⛔' };
  }
  if ([200, 201, 301, 302, 303, 307, 308].includes(httpCode)) {
    return { status: 'OPEN', icon: '✅' };
  }
  if ([401, 403].includes(httpCode)) {
    return { status: 'OPEN (Auth)', icon: '🔒' };
  }
  if (httpCode && httpCode >= 400) {
    return { status: 'OPEN (Error)', icon: '⚠️' };
  }
  if (tcp443 || tcp80) {
    return { status: 'TCP OPEN', icon: '🟡' };
  }
  if (ips && ips.length > 0) {
    return { status: 'DNS ONLY', icon: '🟠' };
  }
  return { status: 'CLOSED', icon: '❌' };
}

export async function scanHost(entry, options = {}) {
  const { timeout = 10000 } = options;
  const domain = entry.domain;
  const isSubdomain = entry.is_subdomain || false;
  const host = entry.host;

  const startTime = Date.now();

  // DNS Resolution
  const ips = await resolveDns(host);

  // HTTP Check (try HTTPS first, then HTTP)
  let httpResult = await checkHttp(host, 'https');
  let usedScheme = 'https';
  if (httpResult.code === null) {
    const httpFallback = await checkHttp(host, 'http');
    if (httpFallback.code !== null) {
      httpResult = httpFallback;
      usedScheme = 'http';
    }
  }

  // TCP Checks
  const tcp443 = await checkTcp(host, 443);
  const tcp80 = await checkTcp(host, 80);

  // Status Classification
  const { status, icon } = classifyStatus(httpResult.code, tcp443, tcp80, ips);

  // Parse Headers
  const headers = httpResult.headers || {};
  const headerKeys = Object.keys(headers).map((k) => k.toLowerCase());

  const server = headers['server'] || '';
  const contentType = (headers['content-type'] || '').split(';')[0].trim();
  const hsts = headerKeys.includes('strict-transport-security');
  const xFrame = headers['x-frame-options'] || '';
  const xPoweredBy = headers['x-powered-by'] || '';
  const xContentType = headers['x-content-type-options'] || '';
  const csp = headerKeys.includes('content-security-policy');

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  return {
    domain,
    host,
    is_subdomain: isSubdomain,
    dns_resolved: ips.length > 0,
    ips,
    http_code: httpResult.code,
    http_error: httpResult.error,
    final_url: httpResult.url,
    scheme: usedScheme,
    tcp_443: tcp443,
    tcp_80: tcp80,
    status,
    status_icon: icon,
    server,
    content_type: contentType,
    x_powered_by: xPoweredBy,
    hsts,
    x_frame_options: xFrame,
    x_content_type: xContentType,
    csp,
    whatweb: [], // Placeholder for WhatWeb integration
    screenshot: null, // Placeholder for screenshot functionality
    scan_time_s: parseFloat(elapsed),
    scanned_at: new Date().toISOString(),
  };
}

export async function scanMultipleHosts(entries, options = {}) {
  const { workers = 12, timeout = 10000 } = options;

  // Parallel scanning with controlled concurrency
  const results = [];
  const queue = [...entries];
  const activePromises = [];

  const processQueue = async () => {
    while (queue.length > 0) {
      const entry = queue.shift();
      const promise = scanHost(entry, { timeout })
        .then((result) => {
          results.push(result);
          return result;
        })
        .catch((err) => {
          console.error(`Error scanning ${entry.host}:`, err);
          return null;
        });

      activePromises.push(promise);

      if (activePromises.length >= workers) {
        await Promise.race(activePromises);
        activePromises.splice(
          activePromises.findIndex((p) => p.then(() => true).catch(() => false)),
          1
        );
      }
    }

    await Promise.all(activePromises);
  };

  await processQueue();

  // Sort by status priority then hostname
  const statusOrder = {
    OPEN: 0,
    'OPEN (Auth)': 1,
    'OPEN (Error)': 2,
    'TCP OPEN': 3,
    'DNS ONLY': 4,
    CLOSED: 5,
    NO_DNS: 6,
  };

  results.sort(
    (a, b) =>
      (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9) ||
      a.host.localeCompare(b.host)
  );

  return results;
}

export function flattenDomains(data) {
  const entries = [];

  for (const item of data) {
    const domain = item.domain;

    // Add apex domain
    entries.push({
      domain,
      host: domain,
      is_subdomain: false,
    });

    // Add subdomains
    if (item.subdomains && Array.isArray(item.subdomains)) {
      for (const subdomain of item.subdomains) {
        if (!SKIP_PREFIXES.some((prefix) => subdomain.startsWith(prefix))) {
          entries.push({
            domain,
            host: subdomain,
            is_subdomain: true,
          });
        }
      }
    }
  }

  return entries;
}

export function calculateStats(results) {
  const counts = {};
  let screenshotCount = 0;
  let openCount = 0;

  for (const result of results) {
    counts[result.status] = (counts[result.status] || 0) + 1;

    if (result.screenshot) {
      screenshotCount++;
    }

    if (result.status.includes('OPEN')) {
      openCount++;
    }
  }

  const closedCount = (counts['CLOSED'] || 0) + (counts['NO_DNS'] || 0);

  return {
    counts,
    total: results.length,
    open: openCount,
    closed: closedCount,
    screenshots: screenshotCount,
  };
}
