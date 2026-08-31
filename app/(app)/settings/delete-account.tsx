import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Feather } from '@expo/vector-icons'
import { Colors, Spacing } from '../../../src/theme'
import { Button, Card, Text, TextField } from '../../../src/components'
import { useToast } from '../../../src/components/ToastProvider'
import { AccountDeletionIncompleteError, useAuthStore } from '../../../src/store/authStore'
import { SettingsScreen } from './_layout'

/**
 * In-app account deletion (issue #18, Apple 5.1.1(v)).
 *
 * Double-confirm flow: an explanatory step (what gets deleted, that it is
 * irreversible) followed by a typed-DELETE confirmation. On success the
 * session is cleared and AuthGate lands the user on the welcome/login screen.
 */

export const CONFIRM_WORD = 'DELETE'

const DELETED_ITEMS = [
  'Your account — email, name, and login',
  'Your profile, bio, tags, and photos',
  'Your matches, likes, and messages',
  'Push notification and device records',
]

export default function DeleteAccountScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const { showToast } = useToast()

  const [step, setStep] = useState<'explain' | 'confirm'>('explain')
  const [confirmText, setConfirmText] = useState('')

  const { mutate: runDeletion, isPending } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      // Session is already cleared by the store; AuthGate routes to welcome.
      queryClient.clear()
      showToast({ variant: 'success', message: 'Your account has been deleted.' })
    },
    onError: (err) => {
      if (err instanceof AccountDeletionIncompleteError) {
        // Signed out locally; profile data is gone but the login remains.
        // Both endpoints tolerate re-runs, so signing in and retrying works.
        queryClient.clear()
        showToast({
          variant: 'error',
          durationMs: 8000,
          message:
            'Your profile was deleted, but we could not finish removing your login. Sign in again and retry, or contact support.',
        })
      } else {
        showToast({ variant: 'error', message: 'Could not delete your account. Please try again.' })
      }
    },
  })

  const confirmed = confirmText.trim() === CONFIRM_WORD

  return (
    <SettingsScreen title="Delete account" testID="settings-delete-account">
      <View style={styles.section}>
        <Card>
          <View style={styles.warningHeader}>
            <Feather name="alert-triangle" size={18} color={Colors.error} />
            <Text preset="subheading" style={styles.warningTitle}>This cannot be undone</Text>
          </View>
          <Text preset="body" color={Colors.textSecondary} style={styles.paragraph}>
            Deleting your account permanently removes everything below. There is no way to
            recover it afterwards.
          </Text>
          <View style={styles.list}>
            {DELETED_ITEMS.map((item) => (
              <View key={item} style={styles.listRow}>
                <Feather name="x-circle" size={14} color={Colors.textMuted} />
                <Text preset="caption" color={Colors.textSecondary} style={styles.listText}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
          <Text preset="caption" color={Colors.textMuted}>
            Kept where legally required: safety records (e.g. reports filed against an account),
            per our Privacy Policy.
          </Text>
        </Card>
      </View>

      {step === 'explain' ? (
        <View style={styles.section}>
          <Button
            testID="delete-account-continue"
            preset="destructive"
            text="Continue to delete"
            onPress={() => setStep('confirm')}
          />
          <Button
            testID="delete-account-cancel"
            preset="ghost"
            text="Cancel"
            onPress={() => router.back()}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <TextField
            testID="delete-account-confirm-input"
            label={`Type ${CONFIRM_WORD} to confirm`}
            helper="This is permanent."
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            editable={!isPending}
          />
          <Button
            testID="delete-account-confirm"
            preset="destructive"
            text={isPending ? 'Deleting…' : 'Permanently delete my account'}
            disabled={!confirmed || isPending}
            onPress={() => runDeletion()}
          />
          <Button
            testID="delete-account-cancel"
            preset="ghost"
            text="Cancel"
            disabled={isPending}
            onPress={() => router.back()}
          />
        </View>
      )}
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  section:       { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  warningTitle:  { color: Colors.error },
  paragraph:     { marginBottom: Spacing.md },
  list:          { gap: Spacing.xs, marginBottom: Spacing.md },
  listRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  listText:      { flex: 1 },
})
