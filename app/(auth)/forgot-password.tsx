import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { forgotPassword } from '../../src/api/auth'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, TextField } from '../../src/components'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    const trimmed = email.toLowerCase().trim()
    if (!trimmed) { setError('Please enter your email'); return }
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(trimmed)
      setSent(true)
    } catch {
      // Even on a network failure we present success because the auth-service
      // intentionally hides whether the email exists. If the call genuinely
      // didn't reach the server the user will just not get an email — they
      // can re-try from this screen.
      setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
        <View style={styles.inner}>
          <Text preset="display" style={styles.heading}>Check your email</Text>
          <Text preset="body" color={Colors.textSecondary} style={styles.body}>
            If an account exists for that email, we just sent a reset link. It's good for an hour.
          </Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.body}>
            Open the link on this device and follow the prompts. You'll sign back in here once you're done.
          </Text>
          <Button
            preset="filled"
            text="Back to sign in"
            onPress={() => router.replace('/(auth)/login')}
          />
        </View>
      </Screen>
    )
  }

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']} keyboardOffset={20}>
      <View style={styles.inner}>
        <Text preset="display" style={styles.heading}>Reset your password</Text>
        <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
          We'll email you a link to set a new one.
        </Text>

        <View style={styles.form}>
          <TextField
            testID="email-input"
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleSubmit}
            status={error ? 'error' : undefined}
            helper={error || undefined}
          />
          <Button
            preset="filled"
            text={submitting ? 'Sending…' : 'Send reset link'}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </View>

        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.linkRow}>
          <Text preset="caption" color={Colors.textMuted}>
            Remembered it?{' '}
            <Text preset="caption" color={Colors.accent}>Back to sign in</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner:   { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl, gap: Spacing.lg },
  heading: { letterSpacing: -1 },
  sub:     { letterSpacing: 0.2 },
  body:    { lineHeight: 22 },
  form:    { gap: Spacing.md },
  linkRow: { alignItems: 'center', marginTop: Spacing.xl },
})
