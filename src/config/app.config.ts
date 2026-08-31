import type { AppConfig } from './types'

const appConfig: AppConfig = {
  tenantId: 'baat',
  appName: 'Baat',
  tagline: 'Matches built on language, faith, family and the little things that feel like home — not just a photo.',
  supportEmail: 'support@example.com',
  legal: {
    termsUrl: 'https://example.com/terms',
    privacyUrl: 'https://example.com/privacy',
  },
  api: {
    // Bring your own backend — see .env.example for the expected API contract.
    authUrl: process.env.EXPO_PUBLIC_AUTH_URL ?? 'https://auth.example.com',
    datingUrl: process.env.EXPO_PUBLIC_DATING_URL ?? 'https://api.example.com',
  },
  theme: {
    // Baat design language — warm espresso surfaces, champagne-gold accent,
    // editorial serif display over Manrope UI.
    colors: {
      bg:            '#14110F',
      bgDeep:        '#0D0B0A',
      surface:       '#1B1713',
      surfaceHigh:   '#241D16',
      border:        '#2F2820',
      borderLight:   '#3A332B',
      textPrimary:   '#F2EDE3',
      textSecondary: '#C8BFB2',
      textMuted:     '#9A9186',
      accent:        '#C9A86A',
      accentBright:  '#D8B878',
      accentSoft:    '#E6CF9F',
      onAccent:      '#1C1610',
      success:       '#7FC98E',
      error:         '#E07A6B',
      online:        '#7FC98E',
      overlay:       'rgba(13,11,10,0.72)',
      overlayLight:  'rgba(242,237,227,0.06)',
    },
    fonts: {
      display:       'InstrumentSerif_400Regular',
      displayItalic: 'InstrumentSerif_400Regular_Italic',
      regular:       'Manrope_400Regular',
      medium:        'Manrope_500Medium',
      semibold:      'Manrope_600SemiBold',
      bold:          'Manrope_700Bold',
      extrabold:     'Manrope_800ExtraBold',
    },
  },
  features: {
    messaging:         true,
    photoUploads:      true,
    pushNotifications: true,
    videoProfiles:     false,
  },
}

export default appConfig
