'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/stores/themeStore'

/**
 * Theme Provider Component
 * 
 * Initializes theme on client-side mount and applies it to the document.
 * This prevents hydration mismatches in Next.js SSR.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme)
  const hydrate = useThemeStore((state) => state._hydrate)

  // Hydrate theme from localStorage on client-side mount
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Apply theme class to document root whenever theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}








