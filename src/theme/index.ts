/**
 * Theme engine — public API.
 *
 * Tokens are sourced from the active tenant config (white-label Phase 1):
 * a tenant supplies its palette + type families, and every component reads
 * them through these exports or the reactive `useTheme()` hook.
 *
 * Static exports (`Colors`, `Fonts`, `Spacing`, `Radius`, `FontSize`) serve
 * `StyleSheet.create` call sites; `ThemeProvider`/`useTheme` expose the same
 * tokens reactively for future runtime theming (light mode, high-contrast
 * accessibility themes, per-locale type scales).
 */
import tenant from '../config/app.config'
import type { TenantTheme } from '../config/types'

export const Colors = tenant.theme.colors
export const Fonts = tenant.theme.fonts

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const Radius = {
  sm: 8,
  md: 16,
  lg: 20,
  /** CTAs are soft pills in the Baat design language. */
  pill: 26,
  full: 9999,
} as const

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
} as const

export interface Theme {
  colors: TenantTheme['colors']
  fonts: TenantTheme['fonts']
  spacing: typeof Spacing
  radius: typeof Radius
  fontSize: typeof FontSize
}

export const AppTheme: Theme = {
  colors: Colors,
  fonts: Fonts,
  spacing: Spacing,
  radius: Radius,
  fontSize: FontSize,
}

export { ThemeProvider, useTheme, useSetTheme } from './ThemeProvider'
