import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Joanna - AI Assistant for Solo Entrepreneurs',
  description: 'Intelligent task management and workflow automation powered by AI',
  keywords: ['AI', 'assistant', 'automation', 'workflow', 'task management'],
  authors: [{ name: 'alanredmond23-bit' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  )
}
