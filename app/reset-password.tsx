/**
 * Deep-link entry point for `https://bamware.io/reset-password?token=…`
 * (Universal Link / App Link target) and `baat://reset-password?token=…`.
 *
 * AuthGate in app/_layout.tsx exempts this route — see DEEP_LINK_PATHS.
 * The user may or may not be signed in when they arrive: an email link
 * tapped while logged out shouldn't bounce them to /login first.
 */

import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { resetPassword } from '../src/api/auth'
import { Colors, Spacing } from '../src/theme'
import { Screen, Text, Button, TextField } from '../src/components'

type FieldError = { password?: string; confirm?: string; form?: string }

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<FieldError>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
        <View style={styles.inner}>
          <Text preset="display" style={styles.heading}>Missing link</Text>
          <Text preset="body" color={Colors.textSecondary} style={styles.body}>
            This screen needs a reset token in the URL. Open the email link again from a single tap.
          </Text>
          <Button preset="filled" text="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    )
  }

  if (done) {
    return (
      <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
        <View style={styles.inner}>
          <Text preset="display" style={styles.heading}>Password updated</Text>
          <Text preset="body" color={Colors.textSecondary} style={styles.body}>
            Sign in with your new password.
          </Text>
          <Button preset="filled" text="Sign in" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    )
  }

  async function handleSubmit() {
    const next: FieldError = {}
    if (!password) next.password = 'Required'
    else if (password.length < 8) next.password = 'At least 8 characters'
    if (password !== confirm) next.confirm = 'Passwords do not match'
    if (Object.keys(next).length) { setErrors(next); return }

    setErrors({})
    setLoading(true)
    try {
      await resetPassword(token!, password)
      setDone(true)
    } catch (err: any) {
      if (err?.response?.status === 400) {
        setErrors({ form: 'This link has expired or already been used. Request a new one from sign in.' })
      } else {
        setErrors({ form: 'Could not update your password. Try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']} keyboardOffset={20}>
      <View style={styles.inner}>
        <Text preset="display" style={styles.heading}>Reset your password</Text>
        <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
          Choose a new password to sign in with.
        </Text>

        <View style={styles.form}>
          <TextField
            testID="password-input"
            label="New password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            status={errors.password ? 'error' : undefined}
            helper={errors.password}
          />
          <TextField
            testID="confirm-input"
            label="Confirm password"
            placeholder="Type it again"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={handleSubmit}
            status={errors.confirm ? 'error' : undefined}
            helper={errors.confirm}
          />
          {errors.form ? (
            <Text preset="caption" color={Colors.error}>{errors.form}</Text>
          ) : null}
          <Button
            preset="filled"
            text={loading ? 'Updating…' : 'Update password'}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>

        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.linkRow}>
          <Text preset="caption" color={Colors.accent}>Back to sign in</Text>
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
