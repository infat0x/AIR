import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ScanResult {
  domain: string
  host: string
  is_subdomain: boolean
  dns_resolved: boolean
  ips: string[]
  http_code: number | null
  http_error: string | null
  final_url: string
  scheme: string
  tcp_443: boolean
  tcp_80: boolean
  status: string
  status_icon: string
  server: string
  content_type: string
  x_powered_by: string
  hsts: boolean
  x_frame_options: string
  x_content_type: string
  csp: boolean
  cloudflare: boolean
  cf_ray: string
  whatweb: string[]
  screenshot: string | null
  scan_time_s: number
  scanned_at: string
}

export interface Stats {
  total: number
  open: number
  closed: number
  screenshots: number
  cloudflare: number
  counts: Record<string, number>
}

export interface HistoryEntry {
  id: string
  label: string          // "example.com + 3 others"
  date: string           // ISO
  stats: Stats
  results: ScanResult[]
  domains: Array<{ domain: string; subdomains: string[] }>
}

interface ScanStore {
  // Current scan
  scanResults: ScanResult[]
  scanStats: Stats | null
  scanId: string | null
  isLoading: boolean
  filters: {
    status: string
    search: string
    showOnlyWithScreenshots: boolean
    showOnlyCloudflare: boolean
    showOnlyHSTS: boolean
    showOnlyCSP: boolean
    httpCode: string
  }
  // History
  history: HistoryEntry[]
  // Actions
  setScanResults: (results: ScanResult[]) => void
  setScanStats: (stats: Stats) => void
  setScanId: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setFilters: (filters: Partial<ScanStore['filters']>) => void
  resetScan: () => void
  getFilteredResults: () => ScanResult[]
  saveToHistory: (domains: Array<{ domain: string; subdomains: string[] }>) => void
  loadFromHistory: (entry: HistoryEntry) => void
  deleteHistory: (id: string) => void
  clearHistory: () => void
}

const DEFAULT_FILTERS = {
  status: 'all',
  search: '',
  showOnlyWithScreenshots: false,
  showOnlyCloudflare: false,
  showOnlyHSTS: false,
  showOnlyCSP: false,
  httpCode: '',
}

export const useScanStore = create<ScanStore>()(
  persist(
    (set, get) => ({
      scanResults: [],
      scanStats: null,
      scanId: null,
      isLoading: false,
      filters: { ...DEFAULT_FILTERS },
      history: [],

      setScanResults: (results) => set({ scanResults: results }),
      setScanStats: (stats) => set({ scanStats: stats }),
      setScanId: (id) => set({ scanId: id }),
      setIsLoading: (loading) => set({ isLoading: loading }),

      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),

      resetScan: () =>
        set({
          scanResults: [],
          scanStats: null,
          scanId: null,
          filters: { ...DEFAULT_FILTERS },
        }),

      saveToHistory: (domains) => {
        const state = get()
        if (!state.scanResults.length || !state.scanStats) return

        const primaryDomain = domains[0]?.domain || 'Unknown'
        const othersCount = domains.length - 1
        const label =
          othersCount > 0
            ? `${primaryDomain} +${othersCount} other${othersCount > 1 ? 's' : ''}`
            : primaryDomain

        const entry: HistoryEntry = {
          id: `hist_${Date.now()}`,
          label,
          date: new Date().toISOString(),
          stats: state.scanStats,
          results: state.scanResults,
          domains,
        }

        set((s) => ({
          history: [entry, ...s.history].slice(0, 50), // Keep last 50
        }))
      },

      loadFromHistory: (entry) =>
        set({
          scanResults: entry.results,
          scanStats: entry.stats,
          scanId: null,
          filters: { ...DEFAULT_FILTERS },
        }),

      deleteHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),

      clearHistory: () => set({ history: [] }),

      getFilteredResults: () => {
        const state = get()
        const { filters, scanResults } = state
        const searchLower = filters.search.toLowerCase()

        return scanResults.filter((result) => {
          const matchesStatus =
            filters.status === 'all' || result.status === filters.status
          const matchesSearch =
            !filters.search ||
            result.host.toLowerCase().includes(searchLower) ||
            result.domain.toLowerCase().includes(searchLower) ||
            result.ips.join(', ').toLowerCase().includes(searchLower) ||
            (result.server || '').toLowerCase().includes(searchLower) ||
            (result.x_powered_by || '').toLowerCase().includes(searchLower)
          const matchesScreenshot = !filters.showOnlyWithScreenshots || !!result.screenshot
          const matchesCloudflare = !filters.showOnlyCloudflare || result.cloudflare
          const matchesHSTS = !filters.showOnlyHSTS || result.hsts
          const matchesCSP = !filters.showOnlyCSP || result.csp
          const matchesHttpCode =
            !filters.httpCode || String(result.http_code || '').startsWith(filters.httpCode)

          return (
            matchesStatus && matchesSearch && matchesScreenshot &&
            matchesCloudflare && matchesHSTS && matchesCSP && matchesHttpCode
          )
        })
      },
    }),
    {
      name: 'air-scan-storage',
      // Only persist history, not current scan state
      partialize: (state) => ({ history: state.history }),
    }
  )
)
