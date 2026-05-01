'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/language'
import { useScanStore } from '@/lib/store'
import { startScan, getScanResults } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export default function Scanner() {
  const { t } = useLanguage()
  const { setScanResults, setScanStats, setScanId, setIsLoading, isLoading } = useScanStore()
  const [jsonInput, setJsonInput] = useState('')
  const [workers, setWorkers] = useState(12)
  const [timeout, setTimeout] = useState(10000)
  const [error, setError] = useState('')

  const handleScan = async () => {
    setError('')

    try {
      // Parse JSON input
      const domains = JSON.parse(jsonInput)

      if (!Array.isArray(domains)) {
        throw new Error('Input must be an array of domains')
      }

      setIsLoading(true)

      // Start scan
      const response = await startScan({
        domains,
        options: { workers, timeout },
      })

      setScanId(response.scanId)

      // Poll for results
      let isCompleted = false
      let attempts = 0
      const maxAttempts = 120 // 2 minutes with 1 second intervals

      while (!isCompleted && attempts < maxAttempts) {
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 1000))

        try {
          const result = await getScanResults(response.scanId)

          if (result.status === 'completed') {
            setScanResults(result.results)
            setScanStats(result.stats)
            isCompleted = true
          }
        } catch (pollError) {
          // Keep polling
        }
      }

      if (!isCompleted) {
        setError('Scan timeout. Results may be incomplete.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start scan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-6">{t('start_scan')}</h2>

        <div className="space-y-6">
          {/* JSON Input */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('paste_json')}</label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[{"domain":"example.com","subdomains":["www.example.com","api.example.com"]}]`}
              className="input h-40 font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted mt-2">
              Array of objects with "domain" and "subdomains" properties
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('workers')}</label>
              <input
                type="number"
                value={workers}
                onChange={(e) => setWorkers(Math.max(1, Math.min(32, parseInt(e.target.value))))}
                min="1"
                max="32"
                className="input"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('timeout')} (ms)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(Math.max(1000, parseInt(e.target.value)))}
                min="1000"
                step="1000"
                className="input"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleScan}
            disabled={isLoading || !jsonInput.trim()}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? t('scan_status') : t('start_scan')}
          </button>
        </div>
      </div>

      {/* Example */}
      <div className="mt-8 card p-6">
        <h3 className="font-semibold mb-3">Example Input:</h3>
        <pre className="bg-dark-1 p-4 rounded overflow-x-auto text-xs">
          {JSON.stringify(
            [
              {
                domain: 'example.com',
                subdomains: ['www.example.com', 'api.example.com', 'mail.example.com'],
              },
              {
                domain: 'example.org',
                subdomains: ['www.example.org'],
              },
            ],
            null,
            2
          )}
        </pre>
      </div>
    </div>
  )
}
