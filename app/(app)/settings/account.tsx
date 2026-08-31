import { StyleSheet, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../../src/store/authStore'
import { Colors, Spacing } from '../../../src/theme'
import { Button, Card, Text } from '../../../src/components'
import { useToast } from '../../../src/components/ToastProvider'
import { SettingsItemRow, SettingsScreen } from './_layout'

export default function AccountSettingsScreen() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { showToast } = useToast()

  // Tokens signed before emailVerified existed leave it undefined — show no
  // status row rather than guessing (mirrors VerificationBanner's behavior).
  const emailStatus =
    user?.emailVerified === true ? 'Verified'
    : user?.emailVerified === false ? 'Unverified'
    : undefined

  return (
    <SettingsScreen title="Account" testID="settings-account">
      <View style={styles.section}>
        <Card>
          <View>
            <SettingsItemRow icon="user" label="Name" value={user?.name} />
            <SettingsItemRow icon="mail" label="Email" value={user?.email} last={!emailStatus} />
            {!!emailStatus && (
              <SettingsItemRow
                icon="check-circle"
                label="Email status"
                value={emailStatus}
                valueColor={user?.emailVerified ? Colors.success : Colors.textMuted}
                last
              />
            )}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">Verification</Text>
        <Card>
          <SettingsItemRow
            icon="shield"
            label="Verify your ID"
            value="Coming soon"
            testID="account-verify-id"
            onPress={() => showToast({ variant: 'info', message: 'ID verification coming soon.' })}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">Danger zone</Text>
        <Card>
          <SettingsItemRow
            icon="trash-2"
            label="Delete account"
            destructive
            testID="account-delete"
            onPress={() => router.push('/(app)/settings/delete-account')}
            last
          />
        </Card>
      </View>

      <Button
        testID="account-sign-out"
        preset="outline"
        text="Sign out"
        onPress={() => logout()}
        textStyle={{ color: Colors.error }}
        style={[styles.signOut, { borderColor: Colors.error + '50' }]}
        LeftAccessory={() => <Feather name="log-out" size={16} color={Colors.error} />}
      />
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  signOut: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.xl },
})
