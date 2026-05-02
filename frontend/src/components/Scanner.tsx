'use client'

import { useState, useRef, useCallback } from 'react'
import { useLanguage } from '@/lib/language'
import { useScanStore } from '@/lib/store'
import { Loader2, Upload, X, FileJson, Camera, Zap, Clock, Users, Globe, ArrowRight, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function Scanner() {
  const { t } = useLanguage()
  const { setScanResults, setScanStats, setScanId, setIsLoading, isLoading, saveToHistory } = useScanStore()
  const [jsonInput, setJsonInput] = useState('')
  const [workers, setWorkers] = useState(12)
  const [scanTimeout, setScanTimeout] = useState(10000)
  const [enableScreenshots, setEnableScreenshots] = useState(true)
  const [error, setError] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<{ total: number; elapsed: number; phase?: string; scanned?: number; phaseTotal?: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setError('Only JSON files are supported')
      return
    }
    setAttachedFile(file)
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      try {
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

  const startProgressTimer = (total: number) => {
    setProgress({ total, elapsed: 0 })
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    const start = Date.now()
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => p ? { ...p, elapsed: Math.floor((Date.now() - start) / 1000) } : null)
    }, 1000)
  }

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }

  const handleScan = async () => {
    setError('')
    setProgress(null)

    try {
      let scanId: string
      let entriesCount: number
      let parsedDomains: Array<{ domain: string; subdomains: string[] }> = []

      if (attachedFile) {
        try {
          const content = jsonInput || await attachedFile.text()
          const parsed = JSON.parse(content)
          parsedDomains = Array.isArray(parsed) ? parsed : parsed.domains || []
        } catch { /* will be caught by server */ }

        const formData = new FormData()
        formData.append('file', attachedFile)
        formData.append('options', JSON.stringify({
          workers,
          timeout: scanTimeout,
          screenshot: enableScreenshots,
        }))

        setIsLoading(true)
        const response = await fetch(`${API_URL}/scan`, { method: 'POST', body: formData })
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to start scan')
        }
        const data = await response.json()
        scanId = data.scanId
        entriesCount = data.entriesCount
      } else {
        const domains = JSON.parse(jsonInput)
        parsedDomains = Array.isArray(domains) ? domains : []
        if (!Array.isArray(domains)) throw new Error('Input must be an array of domains')

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
      startProgressTimer(entriesCount)

      let isCompleted = false
      let attempts = 0
      const maxAttempts = 600 // 10 minutes

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
            globalThis.setTimeout(() => saveToHistory(parsedDomains), 100)
          } else if (result.status === 'error') {
            throw new Error(result.error || 'Scan failed')
          } else if (result.status === 'scanning' && result.progress) {
            // Update progress from backend
            setProgress((p) => p ? {
              ...p,
              phase: result.progress.phase,
              scanned: result.progress.scanned,
              phaseTotal: result.progress.total,
            } : p)
          }
        } catch (pollError: any) {
          if (pollError.message !== 'Failed to fetch') throw pollError
        }
      }

      if (!isCompleted) setError('Scan timeout. Results may be incomplete.')
    } catch (err: any) {
      setError(err.message || 'Failed to start scan')
    } finally {
      setIsLoading(false)
      stopProgressTimer()
      setProgress(null)
    }
  }

  const EXAMPLE_DATA = [
    { domain: 'example.com', subdomains: ['www.example.com', 'api.example.com', 'mail.example.com'] },
    { domain: 'example.org', subdomains: ['www.example.org'] },
  ]

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  // If scanning, show full-screen progress
  if (isLoading && progress) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="card p-10 text-center">
          {/* Animated scanner icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-full opacity-20"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, #0078d4 50%, transparent 100%)',
                animation: 'spin 2s linear infinite',
              }}
            />
            <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: '#111' }}>
              {progress.phase === 'screenshot' ? (
                <Camera className="w-8 h-8" style={{ color: '#0078d4' }} />
              ) : (
                <Globe className="w-8 h-8" style={{ color: '#0078d4' }} />
              )}
            </div>
          </div>

          <h2 className="text-xl font-bold mb-1" style={{ color: '#e0e0e0' }}>
            {progress.phase === 'screenshot' ? '📸 Taking Screenshots...' : t('scan_status')}
          </h2>
          <p className="text-sm mb-3" style={{ color: '#71717a' }}>
            {progress.scanned !== undefined && progress.phaseTotal ? (
              <>
                <span style={{ color: '#4da6ff', fontWeight: 600 }}>{progress.scanned}</span>
                {' / '}
                <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{progress.phaseTotal}</span>
                {progress.phase === 'screenshot' ? ' screenshots' : ' hosts'}
              </>
            ) : (
              <>
                Scanning <span style={{ color: '#0078d4', fontWeight: 600 }}>{progress.total}</span> hosts
              </>
            )}
          </p>

          {/* Percentage */}
          {progress.scanned !== undefined && progress.phaseTotal ? (
            <p className="text-2xl font-bold mb-4" style={{ color: '#0078d4' }}>
              {Math.round((progress.scanned / progress.phaseTotal) * 100)}%
            </p>
          ) : null}

          {/* Progress bar */}
          <div className="relative w-full h-3 rounded-full overflow-hidden mb-4" style={{ background: '#1a1a1a' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                background: progress.phase === 'screenshot'
                  ? 'linear-gradient(90deg, #f97316, #fbbf24)'
                  : 'linear-gradient(90deg, #0078d4, #00b4d8)',
                width: progress.scanned !== undefined && progress.phaseTotal
                  ? `${Math.max(3, (progress.scanned / progress.phaseTotal) * 100)}%`
                  : '15%',
              }}
            />
            {/* Shimmer effect */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          </div>

          {/* Timer + stats */}
          <div className="flex items-center justify-center gap-6 text-sm" style={{ color: '#71717a' }}>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatElapsed(progress.elapsed)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {workers} workers
            </span>
            {enableScreenshots && (
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                Screenshots ON
              </span>
            )}
          </div>
        </div>

        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes progressPulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Dashboard Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
          style={{ background: 'rgba(0,120,212,0.12)', color: '#4da6ff', border: '1px solid rgba(0,120,212,0.2)' }}>
          <Sparkles className="w-3 h-3" />
          v3.0 — Cloudflare Detection + Screenshots
        </div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#f0f0f0' }}>
          {t('start_scan')}
        </h2>
        <p className="text-sm" style={{ color: '#71717a' }}>
          {t('paste_json')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Input */}
        <div className="lg:col-span-2 space-y-5">
          {/* File Drop Zone */}
          <div
            className="rounded-xl transition-all cursor-pointer"
            style={{
              border: isDragging ? '2px dashed #0078d4' : attachedFile ? '2px solid rgba(0,120,212,0.4)' : '2px dashed #2a2a2a',
              background: isDragging ? 'rgba(0,120,212,0.06)' : attachedFile ? 'rgba(0,120,212,0.04)' : 'transparent',
              padding: '24px',
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !attachedFile && fileInputRef.current?.click()}
          >
            {attachedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileJson className="w-5 h-5" style={{ color: '#0078d4' }} />
                <span className="font-medium text-sm" style={{ color: '#4da6ff' }}>{attachedFile.name}</span>
                <span className="text-xs" style={{ color: '#71717a' }}>
                  ({(attachedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setAttachedFile(null) }}
                  className="ml-2 p-1 rounded-full transition-colors"
                  style={{ color: '#ef4444' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-7 h-7" style={{ color: '#52525b' }} />
                <p className="text-sm" style={{ color: '#71717a' }}>{t('drag_drop')}</p>
                <button
                  type="button"
                  className="btn btn-secondary text-xs mt-1"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
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
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value)
                if (attachedFile) setAttachedFile(null)
              }}
              placeholder={`[{"domain":"example.com","subdomains":["www.example.com","api.example.com"]}]`}
              className="input font-mono text-xs resize-y"
              disabled={isLoading}
              style={{ height: '180px', lineHeight: '1.6' }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Start Scan Button */}
          <button
            onClick={handleScan}
            disabled={isLoading || (!jsonInput.trim() && !attachedFile)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (!jsonInput.trim() && !attachedFile) ? '#333' : 'linear-gradient(135deg, #0078d4, #005fa3)',
              color: '#ffffff',
              boxShadow: (!jsonInput.trim() && !attachedFile) ? 'none' : '0 4px 15px rgba(0,120,212,0.3)',
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isLoading ? t('scan_status') : t('start_scan')}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Right Column — Settings */}
        <div className="space-y-5">
          {/* Config Card */}
          <div className="card p-5 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#71717a' }}>
              Configuration
            </h3>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: '#a0a0a0' }}>
                <Users className="w-3.5 h-3.5" style={{ color: '#0078d4' }} />
                {t('workers')}
              </label>
              <input
                type="number"
                value={workers}
                onChange={(e) => setWorkers(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
                min="1" max="32"
                className="input"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: '#a0a0a0' }}>
                <Clock className="w-3.5 h-3.5" style={{ color: '#0078d4' }} />
                {t('timeout')} (ms)
              </label>
              <input
                type="number"
                value={scanTimeout}
                onChange={(e) => setScanTimeout(Math.max(1000, parseInt(e.target.value) || 10000))}
                min="1000" step="1000"
                className="input"
                disabled={isLoading}
              />
            </div>

            {/* Screenshot toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#141414', border: '1px solid #222' }}>
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: '#0078d4' }} />
                <span className="text-xs font-medium" style={{ color: '#c0c0c0' }}>{t('screenshot')}</span>
              </div>
              <button
                onClick={() => setEnableScreenshots(!enableScreenshots)}
                disabled={isLoading}
                className="relative rounded-full transition-colors"
                style={{
                  width: '40px', height: '22px',
                  background: enableScreenshots ? '#0078d4' : '#333',
                }}
              >
                <span
                  className="absolute top-1 rounded-full bg-white transition-transform"
                  style={{
                    width: '14px', height: '14px',
                    transform: enableScreenshots ? 'translateX(20px)' : 'translateX(4px)',
                  }}
                />
              </button>
            </div>
          </div>

          {/* Example Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#71717a' }}>
                Example
              </h3>
              <button
                onClick={() => setJsonInput(JSON.stringify(EXAMPLE_DATA, null, 2))}
                className="text-xs font-medium px-2.5 py-1 rounded transition-colors"
                style={{ color: '#4da6ff', background: 'rgba(0,120,212,0.1)' }}
              >
                Use this
              </button>
            </div>
            <pre className="text-xs overflow-x-auto rounded-lg p-3" style={{ background: '#0d0d0d', color: '#71717a', lineHeight: '1.5' }}>
              {JSON.stringify(EXAMPLE_DATA, null, 2)}
            </pre>
          </div>

          {/* Quick Info */}
          <div className="space-y-2">
            {[
              { icon: '✅', text: 'HTTP/HTTPS reachability check' },
              { icon: '☁️', text: 'Cloudflare IP detection' },
              { icon: '📸', text: 'Screenshot capture' },
              { icon: '🔒', text: 'Security headers analysis' },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs" style={{ color: '#71717a' }}>
                <span>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
