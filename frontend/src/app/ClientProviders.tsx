'use client'
import { LanguageProvider } from '@/lib/language'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
