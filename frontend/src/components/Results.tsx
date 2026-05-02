'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/language'
import { useScanStore, ScanResult } from '@/lib/store'
import { downloadFile } from '@/lib/api'
import { Search, Download, X, ChevronDown, ChevronUp, Cloud, Shield, Camera } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#22c55e',
  'OPEN (Auth)': '#a78bfa',
  'OPEN (Error)': '#f59e0b',
  'TCP OPEN': '#d4d4d8',
  'DNS ONLY': '#fb923c',
  CLOSED: '#ef4444',
  NO_DNS: '#71717a',
}

const CLOUDFLARE_COLOR = '#f97316'

export default function Results() {
  const { t } = useLanguage()
  const { scanResults, scanStats, filters, setFilters, getFilteredResults } = useScanStore()
  const [isExporting, setIsExporting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null)

  const filteredResults = getFilteredResults()

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.search !== '' ||
    filters.showOnlyWithScreenshots ||
    filters.showOnlyCloudflare ||
    filters.showOnlyHSTS ||
    filters.showOnlyCSP ||
    filters.httpCode !== ''

  const clearFilters = () =>
    setFilters({
      status: 'all',
      search: '',
      showOnlyWithScreenshots: false,
      showOnlyCloudflare: false,
      showOnlyHSTS: false,
      showOnlyCSP: false,
      httpCode: '',
    })

  const handleExport = (format: 'json' | 'csv' | 'html') => {
    try {
      setIsExporting(true)
      exportClientSide(filteredResults, scanStats, format)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Screenshot Modal */}
      {screenshotModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setScreenshotModal(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              className="absolute -top-10 right-0 text-white hover:text-red-400"
              onClick={() => setScreenshotModal(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <img src={screenshotModal} alt="Screenshot" className="w-full rounded-lg shadow-2xl" />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label={t('total_scanned')} value={scanStats?.total || 0} color="#60a5fa" />
        <StatCard label={t('ext_open')} value={scanStats?.open || 0} color="#22c55e" />
        <StatCard label={t('cl_nodns')} value={scanStats?.closed || 0} color="#ef4444" />
        <StatCard label={t('cf_count')} value={scanStats?.cloudflare || 0} color={CLOUDFLARE_COLOR} />
        <StatCard label={t('shots_taken')} value={scanStats?.screenshots || 0} color="#22d3ee" />
      </div>

      {/* Filter Bar */}
      <div className="card p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="input pl-10"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: `${t('all')} (${scanResults.length})` },
            { key: 'OPEN', label: `✅ ${t('f_open')} (${scanStats?.counts['OPEN'] || 0})` },
            { key: 'OPEN (Auth)', label: `🔒 ${t('f_auth')} (${scanStats?.counts['OPEN (Auth)'] || 0})` },
            { key: 'OPEN (Error)', label: `⚠️ ${t('f_error')} (${scanStats?.counts['OPEN (Error)'] || 0})` },
            { key: 'TCP OPEN', label: `🟡 ${t('f_tcp')} (${scanStats?.counts['TCP OPEN'] || 0})` },
            { key: 'DNS ONLY', label: `🟠 ${t('f_dns_only')} (${scanStats?.counts['DNS ONLY'] || 0})` },
            { key: 'CLOSED', label: `❌ ${t('f_closed')} (${scanStats?.counts['CLOSED'] || 0})` },
            { key: 'NO_DNS', label: `⛔ ${t('f_nodns')} (${scanStats?.counts['NO_DNS'] || 0})` },
          ].map(({ key, label }) => (
            <FilterButton
              key={key}
              active={filters.status === key}
              onClick={() => setFilters({ status: key })}
              label={label}
            />
          ))}
        </div>

        {/* Advanced Filters Toggle */}
        <button
          className="flex items-center gap-2 text-sm text-muted hover:text-txt transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {t('advanced_filters')}
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-dark-5">
            {/* Toggle Filters */}
            <div className="flex flex-wrap gap-3">
              <ToggleFilter
                icon={<Cloud className="w-3.5 h-3.5" />}
                label={t('f_cloudflare')}
                active={filters.showOnlyCloudflare}
                color={CLOUDFLARE_COLOR}
                onClick={() => setFilters({ showOnlyCloudflare: !filters.showOnlyCloudflare })}
              />
              <ToggleFilter
                icon={<Shield className="w-3.5 h-3.5" />}
                label={t('f_hsts')}
                active={filters.showOnlyHSTS}
                color="#22d3ee"
                onClick={() => setFilters({ showOnlyHSTS: !filters.showOnlyHSTS })}
              />
              <ToggleFilter
                icon={<Shield className="w-3.5 h-3.5" />}
                label={t('f_csp')}
                active={filters.showOnlyCSP}
                color="#a78bfa"
                onClick={() => setFilters({ showOnlyCSP: !filters.showOnlyCSP })}
              />
              {(scanStats?.screenshots || 0) > 0 && (
                <ToggleFilter
                  icon={<Camera className="w-3.5 h-3.5" />}
                  label={t('f_shots')}
                  active={filters.showOnlyWithScreenshots}
                  color="#f59e0b"
                  onClick={() => setFilters({ showOnlyWithScreenshots: !filters.showOnlyWithScreenshots })}
                />
              )}
            </div>

            {/* HTTP Code Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted whitespace-nowrap">{t('http_filter')}:</label>
              <div className="flex gap-2 flex-wrap">
                {['2', '3', '4', '5'].map((code) => (
                  <button
                    key={code}
                    onClick={() => setFilters({ httpCode: filters.httpCode === code ? '' : code })}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors border ${
                      filters.httpCode === code
                        ? 'bg-dark-3 border-green-500 text-green-400'
                        : 'bg-dark-2 border-dark-4 text-muted hover:text-txt'
                    }`}
                  >
                    {code}xx
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <X className="w-3 h-3" /> {t('clear_filters')}
              </button>
            )}
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex gap-2 border-t border-dark-5 pt-3">
          {(['json', 'csv', 'html'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={isExporting}
              className="btn btn-secondary disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {t(`${fmt}_format` as any)}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted self-center">
            {filteredResults.length}/{scanResults.length} results
          </span>
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
                <th className="table-header">{t('col_shot')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, idx) => (
                <ResultRow
                  key={idx}
                  result={result}
                  t={t}
                  showScreenshotCol={true}
                  onScreenshot={setScreenshotModal}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredResults.length === 0 && (
          <div className="p-8 text-center text-muted">{t('no_results')}</div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors border ${
        active
          ? 'bg-dark-3 text-txt border-green-500/50'
          : 'bg-dark-2 text-muted hover:text-txt border-dark-4'
      }`}
    >
      {label}
    </button>
  )
}

function ToggleFilter({
  icon, label, active, color, onClick,
}: {
  icon: React.ReactNode; label: string; active: boolean; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        active ? 'border-opacity-60' : 'bg-dark-2 border-dark-4 text-muted hover:text-txt'
      }`}
      style={active ? { borderColor: color, color, backgroundColor: `${color}15` } : {}}
    >
      {icon}
      {label}
    </button>
  )
}

function ResultRow({
  result, t, showScreenshotCol, onScreenshot,
}: {
  result: ScanResult
  t: (key: any) => string
  showScreenshotCol: boolean
  onScreenshot: (src: string) => void
}) {
  const color = STATUS_COLORS[result.status] || '#71717a'
  const ipsStr = result.ips.join(', ') || '—'
  const httpStr = result.http_code || '—'
  const isCloudflare = result.cloudflare

  return (
    <tr className={`border-b border-dark-2 hover:bg-dark-3 transition-colors ${isCloudflare ? 'hover:bg-orange-500/5' : ''}`}>
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
      <td className="table-cell text-sm">
        <div className="flex flex-col gap-0.5">
          {result.ips.map((ip, i) => (
            <span
              key={i}
              className={`font-mono text-xs ${isCloudflare ? 'text-orange-400 font-semibold' : ''}`}
              title={isCloudflare ? 'Cloudflare IP' : undefined}
            >
              {ip}
            </span>
          ))}
          {isCloudflare && (
            <span className="text-xs font-semibold" style={{ color: CLOUDFLARE_COLOR }}>
              ☁️ Cloudflare
            </span>
          )}
        </div>
      </td>
      <td className="table-cell" style={{ color, fontWeight: 'bold' }}>{httpStr}</td>
      <td className="table-cell space-x-1">
        {result.tcp_443 && <span className="badge badge-teal text-xs">443</span>}
        {result.tcp_80 && <span className="badge badge-teal text-xs">80</span>}
      </td>
      <td className="table-cell text-sm">{result.server || '—'}</td>
      <td className="table-cell space-x-1">
        {result.hsts && <span className="badge badge-green text-xs">HSTS</span>}
        {result.csp && <span className="badge badge-amber text-xs">CSP</span>}
        {result.x_frame_options && (
          <span className="badge badge-zinc text-xs">{result.x_frame_options}</span>
        )}
      </td>
      <td className="table-cell">
        {result.final_url ? (
          <a
            href={result.final_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm truncate max-w-xs block"
            title={result.final_url}
          >
            {result.final_url.length > 35
              ? result.final_url.substring(0, 35) + '...'
              : result.final_url}
          </a>
        ) : (
          '—'
        )}
      </td>
      <td className="table-cell text-sm text-muted">{result.scan_time_s}s</td>
      {showScreenshotCol && (
        <td className="table-cell">
          {result.screenshot ? (
            <button onClick={() => onScreenshot(result.screenshot!)}>
              <img
                src={result.screenshot}
                alt="screenshot"
                className="w-20 h-12 object-cover rounded border border-dark-5 hover:border-green-500 transition-colors cursor-zoom-in"
              />
            </button>
          ) : (
            <span className="text-muted text-xs">—</span>
          )}
        </td>
      )}
    </tr>
  )
}

function exportClientSide(results: ScanResult[], stats: any, format: 'json' | 'csv' | 'html') {
  const timestamp = new Date().toISOString().split('T')[0]

  if (format === 'json') {
    const data = {
      tool: 'Am I reachable? v3.0',
      scan_date: new Date().toISOString(),
      total: results.length,
      stats,
      results,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadFile(blob, `scan_results_${timestamp}.json`)
  } else if (format === 'csv') {
    const headers = [
      'status_icon','status','host','domain','is_subdomain','dns_resolved',
      'ips','cloudflare','http_code','scheme','tcp_443','tcp_80','server',
      'x_powered_by','content_type','hsts','x_frame_options','x_content_type',
      'csp','final_url','scan_time_s',
    ]
    let csv = headers.join(',') + '\n'
    for (const r of results) {
      const row = [
        `"${r.status_icon}"`, `"${r.status}"`, `"${r.host}"`, `"${r.domain}"`,
        r.is_subdomain, r.dns_resolved, `"${r.ips.join(', ')}"`,
        r.cloudflare || false, r.http_code || '', `"${r.scheme}"`,
        r.tcp_443, r.tcp_80, `"${r.server}"`, `"${r.x_powered_by}"`,
        `"${r.content_type}"`, r.hsts, `"${r.x_frame_options}"`,
        `"${r.x_content_type}"`, r.csp, `"${r.final_url}"`, r.scan_time_s,
      ]
      csv += row.join(',') + '\n'
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadFile(blob, `scan_results_${timestamp}.csv`)
  } else {
    const html = generateHtmlReport(results, stats)
    const blob = new Blob([html], { type: 'text/html' })
    downloadFile(blob, `scan_results_${timestamp}.html`)
  }
}

function generateHtmlReport(results: ScanResult[], stats: any): string {
  const rows = results.map((r) => {
    const color = STATUS_COLORS[r.status] || '#71717a'
    const ipsStr = r.ips.join(', ') || '—'
    const cfBadge = r.cloudflare
      ? '<span style="color:#f97316;font-weight:bold;margin-left:4px">☁️ CF</span>'
      : ''
    return `<tr>
      <td><span style="color:${color};font-weight:bold">${r.status_icon} ${r.status}</span></td>
      <td><code>${r.host}</code></td>
      <td>${r.domain}</td>
      <td style="color:${r.cloudflare ? '#f97316' : 'inherit'}">${ipsStr}${cfBadge}</td>
      <td><span style="color:${color};font-weight:bold">${r.http_code || '—'}</span></td>
      <td>${r.server || '—'}</td>
      <td>${r.final_url ? `<a href="${r.final_url}" target="_blank">${r.final_url}</a>` : '—'}</td>
      <td>${r.scan_time_s}s</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Am I reachable? - Results</title>
<style>
body{font-family:-apple-system,sans-serif;background:#0a0a0a;color:#f0f0f0;padding:20px}
.container{max-width:1400px;margin:0 auto}
h1{text-align:center;margin-bottom:20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:30px}
.stat-card{background:#1f1f1f;padding:15px;border-radius:8px;text-align:center;border-left:3px solid #666}
.stat-value{font-size:24px;font-weight:bold}
.stat-label{font-size:12px;color:#999;margin-top:5px}
table{width:100%;border-collapse:collapse;background:#1f1f1f;border-radius:8px;overflow:hidden}
th{background:#111;padding:10px;text-align:left;font-weight:600;font-size:11px;color:#999;text-transform:uppercase}
td{padding:10px;border-bottom:1px solid #2a2a2a;font-size:13px}
tr:last-child td{border-bottom:none}
a{color:#0ea5e9;text-decoration:none}
code{background:#0a0a0a;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px}
</style></head><body><div class="container">
<h1>Am I reachable? — Scan Results</h1>
<div class="stats">
  <div class="stat-card"><div class="stat-value">${stats?.total||0}</div><div class="stat-label">Total</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#22c55e">${stats?.open||0}</div><div class="stat-label">Open</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#ef4444">${stats?.closed||0}</div><div class="stat-label">Closed</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#f97316">${stats?.cloudflare||0}</div><div class="stat-label">Cloudflare</div></div>
</div>
<table><thead><tr><th>Status</th><th>Host</th><th>Domain</th><th>IPs</th><th>HTTP</th><th>Server</th><th>URL</th><th>Time</th></tr></thead>
<tbody>${rows}</tbody></table>
</div></body></html>`
}
