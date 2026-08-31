export interface TenantTheme {
  colors: {
    // Backgrounds
    bg: string
    bgDeep: string
    surface: string
    surfaceHigh: string
    border: string
    borderLight: string
    // Text
    textPrimary: string
    textSecondary: string
    textMuted: string
    // Brand accents
    accent: string
    accentBright: string
    accentSoft: string
    /** Text/icon color used ON accent-filled surfaces. */
    onAccent: string
    // Semantic
    success: string
    error: string
    online: string
    // Overlays
    overlay: string
    overlayLight: string
  }
  fonts: {
    /** Editorial display face for headlines. */
    display: string
    displayItalic: string
    /** UI sans family. */
    regular: string
    medium: string
    semibold: string
    bold: string
    extrabold: string
  }
}

export interface TenantFeatures {
  messaging: boolean
  photoUploads: boolean
  pushNotifications: boolean
  videoProfiles: boolean
}

export interface AppConfig {
  tenantId: string
  appName: string
  tagline: string
  supportEmail: string
  legal: {
    termsUrl: string
    privacyUrl: string
  }
  api: {
    authUrl: string
    datingUrl: string
  }
  theme: TenantTheme
  features: TenantFeatures
}
