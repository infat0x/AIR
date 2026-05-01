'use client'

import { useLanguage, Language, languages } from '@/lib/language'
import { useScanStore } from '@/lib/store'

export default function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { scanResults, resetScan } = useScanStore()

  return (
    <header className="border-b border-dark-5 bg-dark-1 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold">
              Am I <span className="text-green-500">reachable?</span>
            </h1>
            <p className="text-muted text-sm mt-1">{t('subtitle')}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="flex gap-2">
              {(Object.keys(languages) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    language === lang
                      ? 'bg-green-600 text-white'
                      : 'bg-dark-3 text-muted hover:text-txt hover:bg-dark-2'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* New Scan Button */}
            {scanResults.length > 0 && (
              <button
                onClick={resetScan}
                className="btn btn-primary"
              >
                {t('new_scan')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
