import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

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
      <body suppressHydrationWarning className={`${inter.variable} ${fraunces.variable} font-sans flex flex-col h-screen antialiased selection:bg-brass/20 bg-ink-navy text-parchment`}>
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1D2538',
              color: '#F4F1E1',
              border: '1px solid #364259',
            },
          }}
        />
      </body>
    </html>
  )
}
