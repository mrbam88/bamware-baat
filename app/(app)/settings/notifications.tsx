import { useEffect, useState } from 'react'
import { StyleSheet, Switch, View } from 'react-native'
import * as storage from '../../../src/lib/storage'
import { requestPushPermission } from '../../../src/lib/notifications'
import { Colors, Spacing } from '../../../src/theme'
import { Card, Text } from '../../../src/components'
import { useToast } from '../../../src/components/ToastProvider'
import { SettingsScreen } from './_layout'

/**
 * Device-local notification preferences (issue #5 keeps server-side prefs out
 * of scope). The master toggle gates the opt-in that usePushNotifications
 * establishes at login; category toggles are local-only until the backend
 * grows preference storage. Persisted via secure storage.
 */
const KEYS = {
  push:     'notif_pref_push',
  matches:  'notif_pref_matches',
  messages: 'notif_pref_messages',
  likes:    'notif_pref_likes',
} as const

type PrefKey = keyof typeof KEYS

const DEFAULT_PREFS: Record<PrefKey, boolean> = { push: true, matches: true, messages: true, likes: true }

export default function NotificationsSettingsScreen() {
  const { showToast } = useToast()
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(DEFAULT_PREFS)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        (Object.keys(KEYS) as PrefKey[]).map(
          async (key) => [key, (await storage.getItem(KEYS[key])) !== 'false'] as const,
        ),
      )
      if (!cancelled) setPrefs(Object.fromEntries(entries) as Record<PrefKey, boolean>)
    })()
    return () => { cancelled = true }
  }, [])

  async function setPref(key: PrefKey, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
    await storage.setItem(KEYS[key], String(value))

    if (key === 'push' && value) {
      // Best-effort system-level opt-in; the preference itself stays local.
      const granted = await requestPushPermission()
      if (!granted) {
        showToast({
          variant: 'info',
          message: 'Push is off at the system level — enable it in your device Settings.',
        })
      }
    }
  }

  return (
    <SettingsScreen title="Notifications" testID="settings-notifications">
      <View style={styles.section}>
        <Card>
          <ToggleRow
            testID="toggle-push"
            label="Push notifications"
            caption="Master switch for all Baat notifications on this device"
            value={prefs.push}
            onChange={(v) => setPref('push', v)}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">What you hear about</Text>
        <Card>
          <View>
            <ToggleRow
              testID="toggle-matches"
              label="New matches"
              value={prefs.matches}
              disabled={!prefs.push}
              onChange={(v) => setPref('matches', v)}
            />
            <ToggleRow
              testID="toggle-messages"
              label="Messages"
              value={prefs.messages}
              disabled={!prefs.push}
              onChange={(v) => setPref('messages', v)}
            />
            <ToggleRow
              testID="toggle-likes"
              label="Likes"
              value={prefs.likes}
              disabled={!prefs.push}
              onChange={(v) => setPref('likes', v)}
              last
            />
          </View>
        </Card>
      </View>
    </SettingsScreen>
  )
}

function ToggleRow({ label, caption, value, disabled, onChange, last, testID }: {
  label: string
  caption?: string
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  last?: boolean
  testID?: string
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text preset="label">{label}</Text>
        {!!caption && <Text preset="caption" color={Colors.textMuted}>{caption}</Text>}
      </View>
      <Switch
        testID={testID}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.accent }}
        thumbColor={Colors.textPrimary}
        ios_backgroundColor={Colors.border}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section:     { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  row:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  rowBorder:   { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowDisabled: { opacity: 0.45 },
  rowText:     { flex: 1, gap: Spacing.xs },
})
