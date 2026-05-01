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
  }
  setScanResults: (results: ScanResult[]) => void
  setScanStats: (stats: Stats) => void
  setScanId: (id: string) => void
  setIsLoading: (loading: boolean) => void
  setFilters: (filters: Partial<ScanStore['filters']>) => void
  resetScan: () => void
  getFilteredResults: () => ScanResult[]
}

export const useScanStore = create<ScanStore>((set, get) => ({
  scanResults: [],
  scanStats: null,
  scanId: null,
  isLoading: false,
  filters: {
    status: 'all',
    search: '',
    showOnlyWithScreenshots: false,
  },

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
      filters: {
        status: 'all',
        search: '',
        showOnlyWithScreenshots: false,
      },
    }),

  getFilteredResults: () => {
    const state = get()
    const { filters, scanResults } = state
    const searchLower = filters.search.toLowerCase()

    return scanResults.filter((result) => {
      const matchesStatus =
        filters.status === 'all' || result.status.includes(filters.status)
      const matchesSearch =
        !filters.search ||
        result.host.toLowerCase().includes(searchLower) ||
        result.domain.toLowerCase().includes(searchLower) ||
        result.ips.join(', ').toLowerCase().includes(searchLower)
      const matchesScreenshot =
        !filters.showOnlyWithScreenshots || result.screenshot

      return matchesStatus && matchesSearch && matchesScreenshot
    })
  },
}))
