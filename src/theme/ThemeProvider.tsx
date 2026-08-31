import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { AppTheme, type Theme } from './index'

/**
 * Reactive theme access. The default theme derives from the tenant config;
 * alternate themes (light mode, high-contrast, seasonal) can be swapped in
 * at runtime via `useSetTheme` without touching components.
 */

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: AppTheme,
  setTheme: () => {},
})

export function ThemeProvider({ theme = AppTheme, children }: { theme?: Theme; children: ReactNode }) {
  const [current, setCurrent] = useState<Theme>(theme)
  const value = useMemo(() => ({ theme: current, setTheme: setCurrent }), [current])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme
}

export function useSetTheme(): (t: Theme) => void {
  return useContext(ThemeContext).setTheme
}
