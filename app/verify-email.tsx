/**
 * Deep-link entry point for `https://bamware.io/verify-email?token=…`
 * (Universal Link / App Link target) and `baat://verify-email?token=…`.
 *
 * AuthGate exempts this route — the user is usually signed in (they just
 * registered) but might land here from a different device session, so we
 * route appropriately on success.
 */

import { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { verifyEmail } from '../src/api/auth'
import { useAuthStore } from '../src/store/authStore'
import { Colors, Spacing } from '../src/theme'
import { Screen, Text, Button } from '../src/components'

type Status = 'pending' | 'ok' | 'expired' | 'missing' | 'failed'

export default function VerifyEmailScreen() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const setEmailVerified = useAuthStore((s) => s.setEmailVerified)
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'missing')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        await verifyEmail(token)
        if (cancelled) return
        setEmailVerified(true)
        setStatus('ok')
      } catch (err: any) {
        if (cancelled) return
        setStatus(err?.response?.status === 400 ? 'expired' : 'failed')
      }
    })()
    return () => { cancelled = true }
  }, [token, setEmailVerified])

  function next() {
    // Authed users continue inside the app; unauthed land at sign-in.
    if (user) router.replace('/(app)/discover')
    else router.replace('/(auth)/login')
  }

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
      <View style={styles.inner}>
        {status === 'pending' ? (
          <>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text preset="caption" color={Colors.textMuted} style={styles.body}>
              Verifying your email…
            </Text>
          </>
        ) : status === 'ok' ? (
          <>
            <Text preset="display" style={styles.heading}>Email verified</Text>
            <Text preset="body" color={Colors.textSecondary} style={styles.body}>
              You're all set. Welcome to Baat.
            </Text>
            <Button preset="filled" text={user ? 'Continue' : 'Sign in'} onPress={next} />
          </>
        ) : status === 'expired' ? (
          <>
            <Text preset="display" style={styles.heading}>Link expired</Text>
            <Text preset="body" color={Colors.textSecondary} style={styles.body}>
              This verification link has expired or already been used. Tap "Resend" on the banner inside the app to get a fresh one.
            </Text>
            <Button preset="filled" text={user ? 'Continue' : 'Sign in'} onPress={next} />
          </>
        ) : status === 'missing' ? (
          <>
            <Text preset="display" style={styles.heading}>Missing token</Text>
            <Text preset="body" color={Colors.textSecondary} style={styles.body}>
              This screen needs a verification token in the URL. Open the email link again from a single tap.
            </Text>
            <Button preset="filled" text={user ? 'Continue' : 'Sign in'} onPress={next} />
          </>
        ) : (
          <>
            <Text preset="display" style={styles.heading}>Something went wrong</Text>
            <Text preset="body" color={Colors.textSecondary} style={styles.body}>
              Try the link again in a minute, or request a fresh one from the app.
            </Text>
            <Button preset="filled" text={user ? 'Continue' : 'Sign in'} onPress={next} />
          </>
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.lg },
  heading: { letterSpacing: -1, textAlign: 'center' },
  body:    { lineHeight: 22, textAlign: 'center' },
})
