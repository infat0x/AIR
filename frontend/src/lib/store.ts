import { create } from 'zustand'

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

interface Stats {
  total: number
  open: number
  closed: number
  screenshots: number
  cloudflare: number
  counts: Record<string, number>
}

interface ScanStore {
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
  setScanResults: (results: ScanResult[]) => void
  setScanStats: (stats: Stats) => void
  setScanId: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setFilters: (filters: Partial<ScanStore['filters']>) => void
  resetScan: () => void
  getFilteredResults: () => ScanResult[]
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

export const useScanStore = create<ScanStore>((set, get) => ({
  scanResults: [],
  scanStats: null,
  scanId: null,
  isLoading: false,
  filters: { ...DEFAULT_FILTERS },

  setScanResults: (results) => set({ scanResults: results }),
  setScanStats: (stats) => set({ scanStats: stats }),
  setScanId: (id) => set({ scanId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetScan: () =>
    set({
      scanResults: [],
      scanStats: null,
      scanId: null,
      filters: { ...DEFAULT_FILTERS },
    }),

  getFilteredResults: () => {
    const state = get()
    const { filters, scanResults } = state
    const searchLower = filters.search.toLowerCase()

    return scanResults.filter((result) => {
      // Status filter
      const matchesStatus =
        filters.status === 'all' || result.status === filters.status

      // Search filter
      const matchesSearch =
        !filters.search ||
        result.host.toLowerCase().includes(searchLower) ||
        result.domain.toLowerCase().includes(searchLower) ||
        result.ips.join(', ').toLowerCase().includes(searchLower) ||
        (result.server || '').toLowerCase().includes(searchLower) ||
        (result.x_powered_by || '').toLowerCase().includes(searchLower)

      // Screenshot filter
      const matchesScreenshot =
        !filters.showOnlyWithScreenshots || !!result.screenshot

      // Cloudflare filter
      const matchesCloudflare =
        !filters.showOnlyCloudflare || result.cloudflare

      // HSTS filter
      const matchesHSTS =
        !filters.showOnlyHSTS || result.hsts

      // CSP filter
      const matchesCSP =
        !filters.showOnlyCSP || result.csp

      // HTTP code filter
      const matchesHttpCode =
        !filters.httpCode ||
        String(result.http_code || '').startsWith(filters.httpCode)

      return (
        matchesStatus &&
        matchesSearch &&
        matchesScreenshot &&
        matchesCloudflare &&
        matchesHSTS &&
        matchesCSP &&
        matchesHttpCode
      )
    })
  },
}))
