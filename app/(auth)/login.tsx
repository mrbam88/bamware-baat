import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { Colors, Fonts, Spacing, Radius } from '../../src/theme'
import { Screen, Text, Button, TextField, Checkbox, SocialAuthButtons, useToast } from '../../src/components'
import { useKeyboardVisible } from '../../src/hooks/useKeyboardVisible'
import * as biometricAuth from '../../src/lib/biometricAuth'
import { SocialAuthUnavailableError } from '../../src/lib/socialAuth'
import type { SocialProvider } from '../../src/api/auth'
import tenant from '../../src/config/app.config'

const TRAITS = ['✦ ID-verified', 'Pan-South Asian', 'Serious & casual']

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const loginWithBiometrics = useAuthStore((s) => s.loginWithBiometrics)
  const keyboardVisible = useKeyboardVisible()
  const autoPrompted = useRef(false)

  // Prefill the remembered email; if biometric sign-in is enrolled and the
  // hardware can honor it, auto-prompt once. Cancel/fail falls through to the
  // password form already rendered underneath.
  useEffect(() => {
    biometricAuth.getRememberedEmail()
      .then((remembered) => { if (remembered) setEmail(remembered) })
      .catch(() => {})
    ;(async () => {
      if (autoPrompted.current) return
      autoPrompted.current = true
      if (!(await biometricAuth.isBiometricLoginEnabled())) return
      const capability = await biometricAuth.getBiometricCapability()
      if (!capability.available) return
      setBiometricLabel(capability.label)
      await handleBiometricLogin()
    })().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const socialLogin = useAuthStore((s) => s.socialLogin)
  const { showToast } = useToast()

  async function handleLogin() {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setError('')
    setLoading(true)
    try {
      await login(email.toLowerCase().trim(), password, { rememberMe })
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometricLogin() {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithBiometrics()
      if (result === 'failed') setError('Biometric sign-in failed — use your password')
      if (result === 'cancelled' && !(await biometricAuth.isBiometricLoginEnabled())) {
        // Attempt lockout wiped the stored creds — hide the retry affordance.
        setBiometricLabel(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSocialLogin(provider: SocialProvider) {
    setSocialLoading(true)
    try {
      // Cancelling the native sheet resolves without signing in — silent no-op;
      // navigation on success is handled by AuthGate when `user` is set.
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
        {/* Brand + editorial headline */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>{tenant.appName.toUpperCase()}!</Text>
          <Text preset="display">Find someone</Text>
          <Text preset="display">who gets the</Text>
          <View style={styles.headlineRow}>
            <Text preset="displayItalic" color={Colors.accent}>whole </Text>
            <Text preset="display">you.</Text>
          </View>
          {/* Collapse the editorial extras while typing so the form (and the
              focused field) stays on-screen on SE-class devices (issue #17). */}
          {!keyboardVisible && (
            <>
              <Text preset="body" color={Colors.textSecondary} style={styles.tagline}>
                {tenant.tagline}
              </Text>
              <View style={styles.pills}>
                {TRAITS.map((t) => (
                  <View key={t} style={styles.pill}>
                    <Text preset="caption" color={Colors.textSecondary}>{t}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextField
            testID="email-input"
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            testID="password-input"
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            status={error ? 'error' : undefined}
            helper={error || undefined}
          />
          <Checkbox
            testID="remember-me-checkbox"
            label="Remember me"
            checked={rememberMe}
            onChange={setRememberMe}
            disabled={loading}
          />
          <Button
            preset="filled"
            text={loading ? 'Signing in…' : 'Sign in'}
            onPress={handleLogin}
            disabled={loading}
          />
          {biometricLabel ? (
            <Button
              preset="ghost"
              testID="biometric-login-button"
              text={`Sign in with ${biometricLabel}`}
              onPress={handleBiometricLogin}
              disabled={loading}
            />
          ) : null}
          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.inlineLink}>
            <Text preset="caption" color={Colors.textMuted}>
              <Text preset="caption" color={Colors.accent}>Forgot password?</Text>
            </Text>
          </Pressable>
        </View>

        <View style={styles.social}>
          <SocialAuthButtons onPress={handleSocialLogin} disabled={loading || socialLoading} />
        </View>

        <Pressable onPress={() => router.replace('/(auth)/sign-up')} style={styles.linkRow}>
          <Text preset="caption" color={Colors.textMuted}>
            New here?{' '}
            <Text preset="caption" color={Colors.accent}>Create an account</Text>
          </Text>
        </Pressable>

        <Text preset="caption" color={Colors.textMuted} style={styles.footer}>
          By signing in you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner:           { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  header:          { marginBottom: Spacing.xxl },
  wordmark:        { fontFamily: Fonts.semibold, fontSize: 14, color: Colors.accent, letterSpacing: 4, marginBottom: Spacing.lg },
  headlineRow:     { flexDirection: 'row' },
  tagline:         { marginTop: Spacing.md, lineHeight: 22 },
  pills:           { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  pill:            {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  form:            { gap: Spacing.md },
  social:          { marginTop: Spacing.lg },
  inlineLink:      { alignItems: 'center', paddingVertical: Spacing.xs },
  linkRow:         { alignItems: 'center', marginTop: Spacing.xl },
  footer:          { textAlign: 'center', marginTop: Spacing.xxl, lineHeight: 18 },
})
