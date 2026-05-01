import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  scanMultipleHosts,
  flattenDomains,
  calculateStats,
} from '../services/scanner.js';

const router = express.Router();

// In-memory scan cache (in production, use database)
const scanCache = new Map();

/**
 * POST /api/scan
 * Start a domain scan
 * Body: { domains: Array<{domain, subdomains}>, options: {workers, timeout} }
 */
router.post('/scan', async (req, res) => {
  try {
    const { domains, options = {} } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: 'Invalid domains array' });
    }

    const scanId = uuidv4();
    const workers = Math.min(options.workers || 12, 32);
    const timeout = Math.min(options.timeout || 10000, 30000);

    // Flatten domains to individual hosts
    const entries = flattenDomains(domains);

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No valid domains to scan' });
    }

    // Start async scan
    scanMultipleHosts(entries, { workers, timeout })
      .then((results) => {
        const stats = calculateStats(results);
        const scanData = {
          id: scanId,
          status: 'completed',
          startTime: new Date(),
          results,
          stats,
          domains,
        };
        scanCache.set(scanId, scanData);

        // Keep cache for 24 hours
        setTimeout(() => scanCache.delete(scanId), 24 * 60 * 60 * 1000);
      })
      .catch((err) => {
        scanCache.set(scanId, {
          id: scanId,
          status: 'error',
          error: err.message,
        });
      });

    // Return scan ID immediately
    res.json({
      scanId,
      entriesCount: entries.length,
      message: 'Scan started, check status with /api/scan/:scanId',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scan/:scanId
 * Get scan results
 */
router.get('/scan/:scanId', (req, res) => {
  const scanData = scanCache.get(req.params.scanId);

  if (!scanData) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  if (scanData.status === 'error') {
    return res.status(400).json({
      status: 'error',
      error: scanData.error,
    });
  }

  res.json({
    status: scanData.status,
    results: scanData.results || [],
    stats: scanData.stats,
    startTime: scanData.startTime,
  });
});

/**
 * GET /api/scan/:scanId/export?format=json|csv|html
 * Export scan results in different formats
 */
router.get('/scan/:scanId/export', (req, res) => {
  const scanData = scanCache.get(req.params.scanId);
  const format = (req.query.format || 'json').toLowerCase();

  if (!scanData || !scanData.results) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  const { results, stats } = scanData;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="scan_results.json"');
    res.json({
      tool: 'Am I reachable? v3.0',
      scan_date: new Date().toISOString(),
      total: stats.total,
      open: stats.open,
      closed: stats.closed,
      screenshots: stats.screenshots,
      counts: stats.counts,
      results,
    });
  } else if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scan_results.csv"');

    const headers = [
      'status_icon',
      'status',
      'host',
      'domain',
      'is_subdomain',
      'dns_resolved',
      'ips',
      'http_code',
      'scheme',
      'tcp_443',
      'tcp_80',
      'server',
      'x_powered_by',
      'content_type',
      'hsts',
      'x_frame_options',
      'x_content_type',
      'csp',
      'final_url',
      'scan_time_s',
      'scanned_at',
    ];

    let csv = headers.join(',') + '\n';

    for (const result of results) {
      const row = [
        `"${result.status_icon}"`,
        `"${result.status}"`,
        `"${result.host}"`,
        `"${result.domain}"`,
        result.is_subdomain ? 'true' : 'false',
        result.dns_resolved ? 'true' : 'false',
        `"${result.ips.join(', ')}"`,
        result.http_code || '',
        `"${result.scheme}"`,
        result.tcp_443 ? 'true' : 'false',
        result.tcp_80 ? 'true' : 'false',
        `"${result.server}"`,
        `"${result.x_powered_by}"`,
        `"${result.content_type}"`,
        result.hsts ? 'true' : 'false',
        `"${result.x_frame_options}"`,
        `"${result.x_content_type}"`,
        result.csp ? 'true' : 'false',
        `"${result.final_url}"`,
        result.scan_time_s,
        `"${result.scanned_at}"`,
      ];
      csv += row.join(',') + '\n';
    }

    res.send(csv);
  } else if (format === 'html') {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="scan_results.html"');
    res.send(generateHtmlReport(results, stats));
  } else {
    res.status(400).json({ error: 'Invalid format. Use: json, csv, or html' });
  }
});

/**
 * Simple HTML report generator
 */
function generateHtmlReport(results, stats) {
  const statusColors = {
    OPEN: '#22c55e',
    'OPEN (Auth)': '#a78bfa',
    'OPEN (Error)': '#f59e0b',
    'TCP OPEN': '#d4d4d8',
    'DNS ONLY': '#fb923c',
    CLOSED: '#ef4444',
    NO_DNS: '#71717a',
  };

  let tableRows = '';
  for (const r of results) {
    const color = statusColors[r.status] || '#71717a';
    const ipsStr = r.ips.join(', ') || '—';
    const httpStr = r.http_code || '—';

    tableRows += `
      <tr>
        <td><span style="color: ${color}; font-weight: bold">${r.status_icon} ${r.status}</span></td>
        <td><code>${r.host}</code></td>
        <td>${r.domain}</td>
        <td>${ipsStr}</td>
        <td><span style="color: ${color}; font-weight: bold">${httpStr}</span></td>
        <td>${r.server || '—'}</td>
        <td>${r.final_url ? `<a href="${r.final_url}" target="_blank">${r.final_url}</a>` : '—'}</td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Am I reachable? - Scan Results</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          background: #0a0a0a;
          color: #f0f0f0;
          padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 20px; }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #1f1f1f;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border-left: 3px solid #666;
        }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #999; margin-top: 5px; }
        table {
          width: 100%;
          border-collapse: collapse;
          background: #1f1f1f;
          border-radius: 8px;
          overflow: hidden;
        }
        th {
          background: #111;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #2a2a2a;
        }
        tr:last-child td { border-bottom: none; }
        a { color: #0ea5e9; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code {
          background: #0a0a0a;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Am I reachable? - Scan Results</h1>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total Hosts</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.open}</div>
            <div class="stat-label">Externally Open</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.closed}</div>
            <div class="stat-label">Closed / No DNS</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Host</th>
              <th>Domain</th>
              <th>IPs</th>
              <th>HTTP</th>
              <th>Server</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;
}

/**
 * GET /api/docs
 * API Documentation
 */
router.get('/docs', (req, res) => {
  res.json({
    name: 'Am I reachable? API v3.0',
    endpoints: [
      {
        method: 'POST',
        path: '/scan',
        description: 'Start a new domain reachability scan',
        body: {
          domains: [
            {
              domain: 'example.com',
              subdomains: [
                'www.example.com',
                'api.example.com',
                'mail.example.com',
              ],
            },
          ],
          options: {
            workers: 12,
            timeout: 10000,
          },
        },
        response: {
          scanId: 'uuid',
          entriesCount: 4,
          message: 'string',
        },
      },
      {
        method: 'GET',
        path: '/scan/:scanId',
        description: 'Get scan results',
        response: {
          status: 'completed',
          results: [],
          stats: {
            total: 0,
            open: 0,
            closed: 0,
            screenshots: 0,
            counts: {},
          },
        },
      },
      {
        method: 'GET',
        path: '/scan/:scanId/export?format=json|csv|html',
        description: 'Export results in different formats',
      },
    ],
  });
});

export default router;
