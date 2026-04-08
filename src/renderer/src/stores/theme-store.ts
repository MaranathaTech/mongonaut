import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('mongo-viewer-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage may not be available
  }
  return 'dark'
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
  root.style.colorScheme = theme
  localStorage.setItem('mongo-viewer-theme', theme)
}

// Apply initial theme immediately
const initialTheme = getStoredTheme()
applyTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return { theme: next }
    }),

  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  }
}))
