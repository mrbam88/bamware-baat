import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, TextField, SocialAuthButtons, useToast } from '../../src/components'
import { SocialAuthUnavailableError } from '../../src/lib/socialAuth'
import type { SocialProvider } from '../../src/api/auth'
import tenant from '../../src/config/app.config'

type FieldError = { email?: string; password?: string; name?: string; form?: string }

export default function SignUpScreen() {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<FieldError>({})
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const socialLogin = useAuthStore((s) => s.socialLogin)
  const { showToast } = useToast()

  async function handleSignUp() {
    const next: FieldError = {}
    if (!name.trim()) next.name = 'Required'
    if (!email.trim()) next.email = 'Required'
    if (!password) next.password = 'Required'
    else if (password.length < 8) next.password = 'At least 8 characters'
    if (Object.keys(next).length) { setErrors(next); return }

    setErrors({})
    setLoading(true)
    try {
      await register(email.toLowerCase().trim(), password, name.trim())
      router.replace('/(onboarding)')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 409) setErrors({ email: 'Email already registered' })
      else if (status === 400) setErrors({ form: 'Please check your details and try again' })
      else setErrors({ form: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSocialLogin(provider: SocialProvider) {
    setSocialLoading(true)
    try {
      // Cancelling the native sheet resolves without signing in — silent no-op.
      // On success AuthGate routes SSO users into the same (onboarding)/ flow.
      await socialLogin(provider)
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Sign-in failed',
        message:
          err instanceof SocialAuthUnavailableError
            ? err.message
            : "Couldn't sign you in. Please try again.",
      })
    } finally {
      setSocialLoading(false)
    }
  }

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']} keyboardOffset={20}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text preset="display" style={styles.wordmark}>{tenant.appName}</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.tagline}>
            Create your account
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            testID="name-input"
            label="Name"
            placeholder="Your first name"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            status={errors.name ? 'error' : undefined}
            helper={errors.name}
          />
          <TextField
            testID="email-input"
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            status={errors.email ? 'error' : undefined}
            helper={errors.email}
          />
          <TextField
            testID="password-input"
            label="Password"
            placeholder="At least 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSignUp}
            status={errors.password ? 'error' : undefined}
            helper={errors.password}
          />
          {errors.form ? (
            <Text preset="caption" color={Colors.error}>{errors.form}</Text>
          ) : null}
          <Button
            preset="filled"
            text={loading ? 'Creating account…' : 'Create account'}
            onPress={handleSignUp}
            disabled={loading}
          />
        </View>

        <View style={styles.social}>
          <SocialAuthButtons onPress={handleSocialLogin} disabled={loading || socialLoading} />
        </View>

        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.linkRow}>
          <Text preset="caption" color={Colors.textMuted}>
            Already have an account?{' '}
            <Text preset="caption" color={Colors.accent}>Sign in</Text>
          </Text>
        </Pressable>

        <Text preset="caption" color={Colors.textMuted} style={styles.footer}>
          By creating an account you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner:            { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  header:           { alignItems: 'center', marginBottom: Spacing.xxl },
  wordmarkGradient: { borderRadius: 4, paddingHorizontal: 2 },
  wordmark:         { color: Colors.textPrimary, letterSpacing: -1 },
  tagline:          { marginTop: Spacing.sm, letterSpacing: 0.2 },
  form:             { gap: Spacing.md },
  social:           { marginTop: Spacing.lg },
  linkRow:          { alignItems: 'center', marginTop: Spacing.xl },
  footer:           { textAlign: 'center', marginTop: Spacing.xxl, lineHeight: 18 },
})
