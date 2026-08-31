import { Linking, StyleSheet, View } from 'react-native'
import tenant from '../../../src/config/app.config'
import { Spacing } from '../../../src/theme'
import { Card, Text } from '../../../src/components'
import { useToast } from '../../../src/components/ToastProvider'
import { SettingsItemRow, SettingsScreen } from './_layout'

// Legal URLs aren't part of AppConfig yet — single source here until the
// tenant config grows a `legal` section (bamware.com is the marketing domain).


export default function SafetySettingsScreen() {
  const { showToast } = useToast()

  async function open(url: string) {
    try {
      await Linking.openURL(url)
    } catch {
      showToast({ variant: 'error', message: 'Could not open link.' })
    }
  }

  return (
    <SettingsScreen title="Safety & privacy" testID="settings-safety">
      <View style={styles.section}>
        <Text preset="subheading">Your space</Text>
        <Card>
          <SettingsItemRow
            icon="user-x"
            label="Blocked users"
            value="None yet"
            testID="safety-blocked-users"
            onPress={() => showToast({ variant: 'info', message: 'Block list is coming soon.' })}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">Legal</Text>
        <Card>
          <View>
            <SettingsItemRow
              icon="file-text"
              label="Terms of Service"
              external
              testID="safety-terms"
              onPress={() => open(tenant.legal.termsUrl)}
            />
            <SettingsItemRow
              icon="shield"
              label="Privacy Policy"
              external
              testID="safety-privacy"
              onPress={() => open(tenant.legal.privacyUrl)}
              last
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">Support</Text>
        <Card>
          <SettingsItemRow
            icon="mail"
            label="Contact support"
            value={tenant.supportEmail}
            external
            testID="safety-support"
            onPress={() => open(`mailto:${tenant.supportEmail}`)}
            last
          />
        </Card>
      </View>
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
})
