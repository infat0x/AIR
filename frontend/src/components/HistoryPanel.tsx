'use client'

import { useState } from 'react'
import { useScanStore, HistoryEntry } from '@/lib/store'
import { useLanguage } from '@/lib/language'
import { History, Trash2, ChevronRight, X, Clock, Globe, CheckCircle, AlertCircle } from 'lucide-react'

interface HistoryPanelProps {
  onClose: () => void
}

export default function HistoryPanel({ onClose }: HistoryPanelProps) {
  const { history, loadFromHistory, deleteHistory, clearHistory } = useScanStore()
  const { t } = useLanguage()
  const [confirmClear, setConfirmClear] = useState(false)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const handleLoad = (entry: HistoryEntry) => {
    loadFromHistory(entry)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md h-full bg-[#111] border-l border-[#2a2a2a] flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" style={{ color: '#0078d4' }} />
            <h2 className="font-semibold text-base">{t('history')}</h2>
            {history.length > 0 && (
              <span className="badge badge-blue text-xs">{history.length}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
              <History className="w-12 h-12 opacity-20" />
              <p className="text-sm">{t('no_history')}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {history.map((entry) => (
                <HistoryItem
                  key={entry.id}
                  entry={entry}
                  formatDate={formatDate}
                  onLoad={handleLoad}
                  onDelete={(id) => deleteHistory(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-5 py-4 border-t border-[#2a2a2a]">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400 flex-1">{t('confirm_clear')}</span>
                <button
                  onClick={() => { clearHistory(); setConfirmClear(false) }}
                  className="btn bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5"
                >
                  {t('yes_clear')}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="btn btn-secondary text-xs px-3 py-1.5"
                >
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('clear_history')}
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}

function HistoryItem({
  entry, formatDate, onLoad, onDelete,
}: {
  entry: HistoryEntry
  formatDate: (iso: string) => string
  onLoad: (e: HistoryEntry) => void
  onDelete: (id: string) => void
}) {
  const [hover, setHover] = useState(false)

  return (
    <div
      className="px-5 py-4 transition-colors hover:bg-[#1a1a1a] cursor-pointer group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onLoad(entry)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Domain label */}
          <div className="flex items-center gap-2 mb-1.5">
            <Globe className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className="font-medium text-sm truncate text-[#e0e0e0]">
              {entry.label}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted">
              <Clock className="w-3 h-3" />
              {formatDate(entry.date)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatPill
              icon={<CheckCircle className="w-3 h-3" />}
              value={entry.stats.open}
              color="#22c55e"
              label="open"
            />
            <StatPill
              icon={<AlertCircle className="w-3 h-3" />}
              value={entry.stats.closed}
              color="#ef4444"
              label="closed"
            />
            {(entry.stats.cloudflare || 0) > 0 && (
              <StatPill
                icon={<span className="text-xs">☁️</span>}
                value={entry.stats.cloudflare}
                color="#f97316"
                label="CF"
              />
            )}
            <StatPill
              icon={null}
              value={entry.stats.total}
              color="#0078d4"
              label="total"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
            className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronRight
            className="w-4 h-4 text-muted transition-transform group-hover:translate-x-0.5"
            style={{ color: hover ? '#0078d4' : undefined }}
          />
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon, value, color, label }: { icon: React.ReactNode; value: number; color: string; label: string }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {icon}
      {value} {label}
    </span>
  )
}
