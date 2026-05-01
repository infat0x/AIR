'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/language'
import Scanner from '@/components/Scanner'
import Results from '@/components/Results'
import Header from '@/components/Header'
import { useScanStore } from '@/lib/store'

export default function Home() {
  const { t } = useLanguage()
  const { scanResults, isLoading } = useScanStore()

  return (
    <div className="min-h-screen bg-dark-0">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {!scanResults || scanResults.length === 0 ? (
          <Scanner />
        ) : (
          <Results />
        )}
      </div>
    </div>
  )
}
