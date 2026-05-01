import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Am I reachable? - Domain Scanner',
  description: 'Domain External Reachability Scanner',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
