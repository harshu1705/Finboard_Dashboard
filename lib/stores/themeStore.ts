import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  _hydrate: () => void
}

const STORAGE_KEY = 'groww-theme'

/**
 * Load theme from localStorage
 */
function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
  
  return 'dark' // Default
}

/**
 * Save theme to localStorage
 */
function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Theme store with localStorage persistence
 * 
 * Manages theme state (light/dark) and persists to localStorage.
 * Defaults to 'dark' theme.
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // Initial state, will be hydrated on client-side
  
  _hydrate: () => {
    const savedTheme = loadTheme()
    set({ theme: savedTheme })
    applyTheme(savedTheme)
  },
  
  setTheme: (theme) => {
    set({ theme })
    applyTheme(theme)
    saveTheme(theme)
  },
  
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: newTheme })
    applyTheme(newTheme)
    saveTheme(newTheme)
  },
}))

/**
 * Apply theme class to document root
 * This is called whenever theme changes
 */
function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

/**
 * Initialize theme on client-side mount
 * This should be called once when the app loads
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return

  const store = useThemeStore.getState()
  applyTheme(store.theme)
}

