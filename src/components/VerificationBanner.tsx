import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useAuthStore } from '../store/authStore'
import { requestEmailVerification } from '../api/auth'
import { useToast } from './ToastProvider'
import { Colors, Spacing, Radius } from '../theme'
import { Text } from './Text'

/**
 * Renders nothing when the user's email is already verified or when the field
 * is unknown (older tokens without `emailVerified` — see authStore.hydrate).
 * Soft enforcement: never blocks app usage; the user can dismiss for the
 * session via the X.
 */
export function VerificationBanner() {
  const user = useAuthStore((s) => s.user)
  const { showToast } = useToast()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (!user) return null
  if (user.emailVerified !== false) return null  // verified or unknown
  if (dismissed) return null

  async function handleResend() {
    setSending(true)
    try {
      await requestEmailVerification()
      showToast({ variant: 'success', message: 'Verification email sent — check your inbox.' })
    } catch {
      showToast({ variant: 'error', message: 'Could not send. Try again in a minute.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Feather name="mail" size={16} color={Colors.bg} />
      </View>
      <View style={styles.body}>
        <Text preset="caption" weight="semibold" color={Colors.textPrimary}>Verify your email</Text>
        <Text preset="caption" color={Colors.textSecondary}>
          Tap the link we sent to <Text preset="caption" color={Colors.textPrimary}>{user.email}</Text>.
        </Text>
      </View>
      <Pressable onPress={handleResend} disabled={sending} style={styles.action}>
        <Text preset="caption" weight="semibold" color={Colors.accent}>
          {sending ? '…' : 'Resend'}
        </Text>
      </Pressable>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8} style={styles.dismiss}>
        <Feather name="x" size={14} color={Colors.textMuted} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  icon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  body:    { flex: 1, gap: 2 },
  action:  { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  dismiss: { padding: Spacing.xs },
})
