'use client'

import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/lib/stores/themeStore'

/**
 * Theme Toggle Component
 * 
 * Button to toggle between light and dark themes.
 * Shows sun icon for light mode, moon icon for dark mode.
 */
export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center rounded-lg border border-gray-800 bg-transparent p-2 text-foreground transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}








