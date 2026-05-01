import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export interface ScanPayload {
  domains: Array<{
    domain: string
    subdomains: string[]
  }>
  options?: {
    workers?: number
    timeout?: number
  }
}

export interface ScanResponse {
  scanId: string
  entriesCount: number
  message: string
}

export interface ScanResultResponse {
  status: string
  results: any[]
  stats: {
    total: number
    open: number
    closed: number
    screenshots: number
    counts: Record<string, number>
  }
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
})

export async function startScan(payload: ScanPayload): Promise<ScanResponse> {
  const response = await api.post<ScanResponse>('/scan', payload)
  return response.data
}

export async function getScanResults(scanId: string): Promise<ScanResultResponse> {
  const response = await api.get<ScanResultResponse>(`/scan/${scanId}`)
  return response.data
}

export async function exportScan(
  scanId: string,
  format: 'json' | 'csv' | 'html'
): Promise<Blob> {
  const response = await api.get(`/scan/${scanId}/export?format=${format}`, {
    responseType: 'blob',
  })
  return response.data
}

export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default api
