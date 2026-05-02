'use client'

import { useState } from 'react'
import { useLanguage, Language, languages } from '@/lib/language'
import { useScanStore } from '@/lib/store'
import { History, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'

const HistoryPanel = dynamic(() => import('./HistoryPanel'), { ssr: false })

export default function Header() {
  const { language, setLanguage, t } = useLanguage()
  const scanResults = useScanStore((s) => s.scanResults)
  const resetScan = useScanStore((s) => s.resetScan)
  const history = useScanStore((s) => s.history)
  const [showHistory, setShowHistory] = useState(false)

  return (
    <>
      <header className="border-b border-[#1e1e1e] bg-[#0d0d0d] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div
              className="cursor-pointer select-none"
              onClick={scanResults.length > 0 ? resetScan : undefined}
            >
              <h1 className="text-2xl font-bold tracking-tight">
                Am I{' '}
                <span style={{ color: '#0078d4' }}>reachable?</span>
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>{t('subtitle')}</p>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
                {(Object.keys(languages) as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    style={
                      language === lang
                        ? { background: '#0078d4', color: '#fff', padding: '6px 12px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const }
                        : { background: '#1a1a1a', color: '#71717a', padding: '6px 12px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const }
                    }
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* History Button */}
              <button
                onClick={() => setShowHistory(true)}
                className="relative flex items-center gap-1.5 btn btn-secondary"
                title={t('history')}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{t('history')}</span>
                {history.length > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
                    style={{ background: '#0078d4', width: '18px', height: '18px', fontSize: '10px' }}
                  >
                    {history.length > 9 ? '9+' : history.length}
                  </span>
                )}
              </button>

              {/* New Scan Button */}
              {scanResults.length > 0 && (
                <button
                  onClick={resetScan}
                  className="flex items-center gap-1.5 btn"
                  style={{ background: '#0078d4', color: '#fff' }}
                >
                  <Plus className="w-4 h-4" />
                  {t('new_scan')}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}
    </>
  )
}
