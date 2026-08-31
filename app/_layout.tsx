import { useEffect } from 'react'
import { LogBox } from 'react-native'
import { Slot, useRouter, useSegments } from 'expo-router'
import * as Sentry from '@sentry/react-native'

LogBox.ignoreAllLogs()
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope'
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif'
import { ThemeProvider } from '../src/theme'
import { useAuthStore } from '../src/store/authStore'
import { logger } from '../src/lib/logger'
import { ToastProvider, BiometricEnrollPrompt } from '../src/components'
import { usePushNotifications } from '../src/hooks/usePushNotifications'
import { getMyProfile } from '../src/api/profile'
import { MIN_SELECTED_TAGS } from '../src/constants/tags'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'dev' : 'prod',
  tracesSampleRate: __DEV__ ? 0 : 0.1,
  enabled: !__DEV__,
})

const queryClient = new QueryClient()

function AuthGate() {
  const { user, isLoading, hydrate } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { deregister } = usePushNotifications(user?.userId ?? null)

  // Fetch the profile only when we have an authenticated user. 404 is a valid
  // outcome (user signed up but hasn't created a profile yet), so we don't
  // retry on it — getMyProfile returns null for 404 instead of throwing.
  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    enabled: !!user,
    retry: false,
    staleTime: 30_000,
  })

  useEffect(() => {
    hydrate()
  }, [])

  // Clear cached profile when the user logs out so the next sign-in re-fetches.
  useEffect(() => {
    if (!user) queryClient.removeQueries({ queryKey: ['my-profile'] })
  }, [user, queryClient])

  useEffect(() => {
    if (isLoading) return
    const inAuth = segments[0] === '(auth)'
    const inApp = segments[0] === '(app)'
    const inOnboarding = segments[0] === '(onboarding)'
    // Deep-link entry points — universal-link or scheme open straight into
    // these. Skip auth-state-driven redirects so a logged-out user landing
    // on /reset-password isn't bounced to /login mid-flow.
    const inDeepLink = segments[0] === 'reset-password' || segments[0] === 'verify-email'

    if (inDeepLink) return

    if (!user) {
      logger.clearContext()
      Sentry.setUser(null)
      if (!inAuth) router.replace('/(auth)/login')
      return
    }

    logger.setContext({ userId: user.userId, tenantId: user.tenantId })
    Sentry.setUser({ id: user.userId, email: user.email })

    // Wait for the first profile fetch to settle before deciding where to land.
    if (profileQuery.isLoading) return

    const profile = profileQuery.data
    const wizardComplete =
      !!profile && profile.photos.length > 0 && profile.tags.length >= MIN_SELECTED_TAGS

    if (wizardComplete) {
      if (!inApp) router.replace('/(app)/discover')
      return
    }

    // Incomplete profile. Let the user navigate freely between onboarding
    // steps; only force-redirect when they're somewhere else (login, discover).
    if (!inOnboarding) {
      if (!profile) router.replace('/(onboarding)/')
      else if (profile.photos.length === 0) router.replace('/(onboarding)/photos')
      // Cultural answers (issue #3) aren't persisted by the service yet, so we
      // can't tell how far past photos the user got — resume at the first
      // cultural step. Re-answering is cheap; silently skipping steps isn't.
      else router.replace('/(onboarding)/looking-for')
    }
  }, [user, isLoading, segments, profileQuery.isLoading, profileQuery.data])

  return <Slot />
}

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  })

  if (!fontsLoaded) return null

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <ToastProvider>
          <AuthGate />
          <BiometricEnrollPrompt />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
})
