import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' })

export const metadata: Metadata = {
  title: 'Premium AI Chat (Pactum Integration)',
  description: 'AI Chat integration using Pactum for micropayments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} font-sans flex flex-col h-screen antialiased selection:bg-brass/20 bg-ink-navy text-parchment`}>
        {children}
      </body>
    </html>
  )
}
