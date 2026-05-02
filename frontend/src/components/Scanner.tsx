'use client'

import { useState, useRef, useCallback } from 'react'
import { useLanguage } from '@/lib/language'
import { useScanStore } from '@/lib/store'
import { Loader2, Upload, X, FileJson, Camera } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function Scanner() {
  const { t } = useLanguage()
  const { setScanResults, setScanStats, setScanId, setIsLoading, isLoading, saveToHistory } = useScanStore()
  const [jsonInput, setJsonInput] = useState('')
  const [workers, setWorkers] = useState(12)
  const [scanTimeout, setScanTimeout] = useState(10000)
  const [enableScreenshots, setEnableScreenshots] = useState(false)
  const [error, setError] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<{ scanned: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setError('Only JSON files are supported')
      return
    }
    setAttachedFile(file)
    setError('')

    // Read file content into textarea for preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      try {
        // Validate and prettify
        const parsed = JSON.parse(content)
        setJsonInput(JSON.stringify(parsed, null, 2))
      } catch {
        setJsonInput(content)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleScan = async () => {
    setError('')
    setProgress(null)

    try {
      let scanId: string
      let entriesCount: number
      let parsedDomains: Array<{ domain: string; subdomains: string[] }> = []

      if (attachedFile) {
        // Parse attached file to get domains for history
        try {
          const content = jsonInput || await attachedFile.text()
          const parsed = JSON.parse(content)
          parsedDomains = Array.isArray(parsed) ? parsed : parsed.domains || []
        } catch { /* will be caught by server */ }

        // Send as multipart/form-data with file
        const formData = new FormData()
        formData.append('file', attachedFile)
        formData.append('options', JSON.stringify({
          workers,
          timeout: scanTimeout,
          screenshot: enableScreenshots,
        }))

        setIsLoading(true)
        const response = await fetch(`${API_URL}/scan`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to start scan')
        }

        const data = await response.json()
        scanId = data.scanId
        entriesCount = data.entriesCount
      } else {
        // Send as JSON body
        const domains = JSON.parse(jsonInput)
        parsedDomains = Array.isArray(domains) ? domains : []

        if (!Array.isArray(domains)) {
          throw new Error('Input must be an array of domains')
        }

        setIsLoading(true)

        const response = await fetch(`${API_URL}/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domains,
            options: { workers, timeout: scanTimeout, screenshot: enableScreenshots },
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to start scan')
        }

        const data = await response.json()
        scanId = data.scanId
        entriesCount = data.entriesCount
      }

      setScanId(scanId)
      setProgress({ scanned: 0, total: entriesCount })

      // Poll for results
      let isCompleted = false
      let attempts = 0
      const maxAttempts = 180 // 3 minutes

      while (!isCompleted && attempts < maxAttempts) {
        attempts++
        await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 1000))

        try {
          const res = await fetch(`${API_URL}/scan/${scanId}`)
          const result = await res.json()

          if (result.status === 'completed') {
            setScanResults(result.results)
            setScanStats(result.stats)
            isCompleted = true
            // Auto-save to history
            globalThis.setTimeout(() => saveToHistory(parsedDomains), 100)
          } else if (result.status === 'error') {
            throw new Error(result.error || 'Scan failed')
          } else if (result.status === 'pending' && result.entriesCount) {
            setProgress({ scanned: 0, total: result.entriesCount })
          }
        } catch (pollError: any) {
          if (pollError.message !== 'Failed to fetch') {
            throw pollError
          }
          // Network error - keep polling
        }
      }

      if (!isCompleted) {
        setError('Scan timeout. Results may be incomplete.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start scan')
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }

  const EXAMPLE_DATA = [
    {
      domain: 'example.com',
      subdomains: ['www.example.com', 'api.example.com', 'mail.example.com'],
    },
    {
      domain: 'example.org',
      subdomains: ['www.example.org'],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-6">{t('start_scan')}</h2>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-green-500 bg-green-500/10'
                : attachedFile
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-dark-5 hover:border-dark-4'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !attachedFile && fileInputRef.current?.click()}
          >
            {attachedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileJson className="w-6 h-6 text-green-400" />
                <span className="text-green-300 font-medium">{attachedFile.name}</span>
                <span className="text-muted text-sm">
                  ({(attachedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAttachedFile(null)
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-muted mx-auto" />
                <p className="text-muted text-sm">{t('drag_drop')}</p>
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                >
                  {t('attach_file')}
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />

          {/* JSON Textarea */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('paste_json')}</label>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value)
                if (attachedFile) setAttachedFile(null)
              }}
              placeholder={`[{"domain":"example.com","subdomains":["www.example.com","api.example.com"]}]`}
              className="input h-36 font-mono text-sm resize-y"
              disabled={isLoading}
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('workers')}</label>
              <input
                type="number"
                value={workers}
                onChange={(e) => setWorkers(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
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
                value={scanTimeout}
                onChange={(e) => setScanTimeout(Math.max(1000, parseInt(e.target.value) || 10000))}
                min="1000"
                step="1000"
                className="input"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Screenshot toggle */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-dark-2 border border-dark-5">
            <Camera className="w-5 h-5 text-muted" />
            <div className="flex-1">
              <div className="text-sm font-medium">{t('screenshot')}</div>
              <div className="text-xs text-muted">Requires Puppeteer on the server</div>
            </div>
            <button
              onClick={() => setEnableScreenshots(!enableScreenshots)}
              disabled={isLoading}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                enableScreenshots ? 'bg-green-600' : 'bg-dark-5'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  enableScreenshots ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-start gap-2">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Progress */}
          {isLoading && progress && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-300 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('scan_status')} — {progress.total} hosts
              </div>
              <div className="w-full bg-dark-3 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-blue-500 animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleScan}
            disabled={isLoading || (!jsonInput.trim() && !attachedFile)}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? t('scan_status') : t('start_scan')}
          </button>
        </div>
      </div>

      {/* Example */}
      <div className="mt-8 card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Example Input:</h3>
          <button
            onClick={() => setJsonInput(JSON.stringify(EXAMPLE_DATA, null, 2))}
            className="text-xs btn btn-secondary py-1"
          >
            Use Example
          </button>
        </div>
        <pre className="bg-dark-1 p-4 rounded overflow-x-auto text-xs text-muted">
          {JSON.stringify(EXAMPLE_DATA, null, 2)}
        </pre>
      </div>
    </div>
  )
}
