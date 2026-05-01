'use client'

import { useState, useMemo } from 'react'
import { useLanguage } from '@/lib/language'
import { useScanStore, ScanResult } from '@/lib/store'
import { exportScan, downloadFile } from '@/lib/api'
import { Search, Download } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#22c55e',
  'OPEN (Auth)': '#a78bfa',
  'OPEN (Error)': '#f59e0b',
  'TCP OPEN': '#d4d4d8',
  'DNS ONLY': '#fb923c',
  CLOSED: '#ef4444',
  'NO_DNS': '#71717a',
}

export default function Results() {
  const { t } = useLanguage()
  const {
    scanResults,
    scanStats,
    filters,
    setFilters,
    getFilteredResults,
  } = useScanStore()
  const [isExporting, setIsExporting] = useState(false)

  const filteredResults = getFilteredResults()

  const handleExport = async (format: 'json' | 'csv' | 'html') => {
    try {
      setIsExporting(true)
      // Note: In a real app, you'd use the scanId from the store
      // For now, we'll create a client-side export
      exportClientSide(filteredResults, scanStats, format)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('total_scanned')}
          value={scanStats?.total || 0}
          color="#60a5fa"
        />
        <StatCard
          label={t('ext_open')}
          value={scanStats?.open || 0}
          color="#22c55e"
        />
        <StatCard
          label={t('cl_nodns')}
          value={scanStats?.closed || 0}
          color="#ef4444"
        />
        <StatCard
          label={t('shots_taken')}
          value={scanStats?.screenshots || 0}
          color="#22d3ee"
        />
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="input pl-10"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filters.status === 'all'}
              onClick={() => setFilters({ status: 'all' })}
              label={`${t('all')} (${scanResults.length})`}
            />
            <FilterButton
              active={filters.status === 'OPEN'}
              onClick={() => setFilters({ status: 'OPEN' })}
              label={`✅ ${t('f_open')} (${scanStats?.counts['OPEN'] || 0})`}
            />
            <FilterButton
              active={filters.status === 'TCP OPEN'}
              onClick={() => setFilters({ status: 'TCP OPEN' })}
              label={`🟡 TCP (${scanStats?.counts['TCP OPEN'] || 0})`}
            />
            <FilterButton
              active={filters.status === 'DNS ONLY'}
              onClick={() => setFilters({ status: 'DNS ONLY' })}
              label={`🟠 DNS (${scanStats?.counts['DNS ONLY'] || 0})`}
            />
            <FilterButton
              active={filters.status === 'CLOSED'}
              onClick={() => setFilters({ status: 'CLOSED' })}
              label={`❌ ${t('f_closed')} (${scanStats?.counts['CLOSED'] || 0})`}
            />
            <FilterButton
              active={filters.status === 'NO_DNS'}
              onClick={() => setFilters({ status: 'NO_DNS' })}
              label={`⛔ ${t('f_nodns')} (${scanStats?.counts['NO_DNS'] || 0})`}
            />
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <ExportButton
              format="json"
              label={t('json_format')}
              onClick={() => handleExport('json')}
              isLoading={isExporting}
            />
            <ExportButton
              format="csv"
              label={t('csv_format')}
              onClick={() => handleExport('csv')}
              isLoading={isExporting}
            />
            <ExportButton
              format="html"
              label={t('html_format')}
              onClick={() => handleExport('html')}
              isLoading={isExporting}
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-5">
                <th className="table-header">{t('col_status')}</th>
                <th className="table-header">{t('col_host')}</th>
                <th className="table-header">{t('col_domain')}</th>
                <th className="table-header">{t('col_ips')}</th>
                <th className="table-header">{t('col_http')}</th>
                <th className="table-header">{t('col_tcp')}</th>
                <th className="table-header">{t('col_server')}</th>
                <th className="table-header">{t('col_sec')}</th>
                <th className="table-header">{t('col_url')}</th>
                <th className="table-header">{t('col_time')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, idx) => (
                <ResultRow key={idx} result={result} t={t} />
              ))}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="p-8 text-center text-muted">
            {t('no_results') || 'No results match your filters'}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div
      className="card p-4 border-l-4"
      style={{ borderLeftColor: color }}
    >
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${
        active
          ? 'bg-dark-3 text-txt border border-dark-4'
          : 'bg-dark-2 text-muted hover:text-txt border border-dark-4'
      }`}
    >
      {label}
    </button>
  )
}

function ExportButton({
  format,
  label,
  onClick,
  isLoading,
}: {
  format: string
  label: string
  onClick: () => void
  isLoading: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="btn btn-secondary disabled:opacity-50 flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  )
}

function ResultRow({
  result,
  t,
}: {
  result: ScanResult
  t: (key: string) => string
}) {
  const color = STATUS_COLORS[result.status] || '#71717a'
  const ipsStr = result.ips.join(', ') || '—'
  const httpStr = result.http_code || '—'

  const hstsBadge = result.hsts && (
    <span className="badge badge-green text-xs">HSTS</span>
  )
  const cspBadge = result.csp && (
    <span className="badge badge-amber text-xs">CSP</span>
  )
  const xfBadge = result.x_frame_options && (
    <span className="badge badge-zinc text-xs">{result.x_frame_options}</span>
  )

  return (
    <tr className="border-b border-dark-2 hover:bg-dark-3 transition-colors">
      <td className="table-cell">
        <span style={{ color, fontWeight: 'bold' }}>
          {result.status_icon} {result.status}
        </span>
      </td>
      <td className="table-cell">
        <code className="code">{result.host}</code>
        {!result.is_subdomain && (
          <span className="badge badge-green text-xs ml-2">{t('apex')}</span>
        )}
      </td>
      <td className="table-cell text-sm text-muted">{result.domain}</td>
      <td className="table-cell text-sm">{ipsStr}</td>
      <td className="table-cell" style={{ color, fontWeight: 'bold' }}>
        {httpStr}
      </td>
      <td className="table-cell space-x-1">
        {result.tcp_443 && (
          <span className="badge badge-teal text-xs">443</span>
        )}
        {result.tcp_80 && (
          <span className="badge badge-teal text-xs">80</span>
        )}
      </td>
      <td className="table-cell text-sm">{result.server || '—'}</td>
      <td className="table-cell space-x-1">
        {hstsBadge}
        {cspBadge}
        {xfBadge}
      </td>
      <td className="table-cell">
        {result.final_url ? (
          <a
            href={result.final_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm truncate max-w-xs"
          >
            {result.final_url.substring(0, 30)}...
          </a>
        ) : (
          '—'
        )}
      </td>
      <td className="table-cell text-sm text-muted">{result.scan_time_s}s</td>
    </tr>
  )
}

function exportClientSide(
  results: ScanResult[],
  stats: any,
  format: 'json' | 'csv' | 'html'
) {
  const timestamp = new Date().toISOString().split('T')[0]

  if (format === 'json') {
    const data = {
      tool: 'Am I reachable? v3.0',
      scan_date: new Date().toISOString(),
      total: results.length,
      stats,
      results,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    downloadFile(blob, `scan_results_${timestamp}.json`)
  } else if (format === 'csv') {
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
    ]

    let csv = headers.join(',') + '\n'
    for (const result of results) {
      const row = [
        `"${result.status_icon}"`,
        `"${result.status}"`,
        `"${result.host}"`,
        `"${result.domain}"`,
        result.is_subdomain,
        result.dns_resolved,
        `"${result.ips.join(', ')}"`,
        result.http_code || '',
        `"${result.scheme}"`,
        result.tcp_443,
        result.tcp_80,
        `"${result.server}"`,
        `"${result.x_powered_by}"`,
        `"${result.content_type}"`,
        result.hsts,
        `"${result.x_frame_options}"`,
        `"${result.x_content_type}"`,
        result.csp,
        `"${result.final_url}"`,
        result.scan_time_s,
      ]
      csv += row.join(',') + '\n'
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    downloadFile(blob, `scan_results_${timestamp}.csv`)
  } else if (format === 'html') {
    const html = generateHtmlReport(results, stats)
    const blob = new Blob([html], { type: 'text/html' })
    downloadFile(blob, `scan_results_${timestamp}.html`)
  }
}

function generateHtmlReport(results: ScanResult[], stats: any): string {
  const rowsHtml = results
    .map((r) => {
      const color = STATUS_COLORS[r.status] || '#71717a'
      const ipsStr = r.ips.join(', ') || '—'
      const httpStr = r.http_code || '—'

      return `
        <tr>
          <td><span style="color: ${color}; font-weight: bold">${r.status_icon} ${r.status}</span></td>
          <td><code style="background: #0a0a0a; padding: 2px 6px; border-radius: 4px;">${r.host}</code></td>
          <td>${r.domain}</td>
          <td>${ipsStr}</td>
          <td><span style="color: ${color}; font-weight: bold">${httpStr}</span></td>
          <td>${r.server || '—'}</td>
          <td>${r.final_url ? `<a href="${r.final_url}" target="_blank">${r.final_url}</a>` : '—'}</td>
          <td>${r.scan_time_s}s</td>
        </tr>
      `
    })
    .join('')

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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Am I reachable? - Scan Results</h1>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${results.length}</div>
            <div class="stat-label">Total Hosts</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats?.open || 0}</div>
            <div class="stat-label">Externally Open</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats?.closed || 0}</div>
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
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `
}
