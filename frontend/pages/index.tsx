'use client'

import { useState } from 'react'
import Head from 'next/head'
import { useLanguage } from '@/lib/language'
import Scanner from '@/components/Scanner'
import Results from '@/components/Results'
import Header from '@/components/Header'
import { useScanStore } from '@/lib/store'

export default function Home() {
  const { t } = useLanguage()
  const { scanResults, isLoading } = useScanStore()

  return (
    <>
      <Head>
        <title>Am I reachable? - Domain Scanner</title>
        <meta name="description" content="Domain External Reachability Scanner" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
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
    </>
  )
}
