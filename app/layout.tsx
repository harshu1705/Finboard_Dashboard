import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finance Dashboard',
  description: 'Production-ready finance dashboard built with Next.js',
  // Optimize for production
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#000000', // Dark theme color for mobile browsers
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}

