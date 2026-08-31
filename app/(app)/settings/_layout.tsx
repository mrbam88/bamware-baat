import type { ReactNode } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Colors, Spacing } from '../../../src/theme'
import { Screen, Text } from '../../../src/components'

/**
 * Settings stack — nested inside the (app) Tabs navigator (declared there
 * with `href: null`) so the tab bar stays visible on every settings screen.
 * Headers are hand-rolled by the SettingsScreen scaffold below.
 */
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}

/**
 * Shared scaffold for the settings sub-screens: back chevron + serif title
 * above scrollable content.
 *
 * Lives in _layout.tsx rather than its own file because expo-router registers
 * every other .tsx file under app/ as a route; named exports on a layout are
 * ignored by the router. Deliberately NOT in the src/components barrel —
 * this is settings-only chrome.
 */
export function SettingsScreen({ title, children, testID }: {
  title: string
  children: ReactNode
  testID?: string
}) {
  const router = useRouter()

  return (
    <Screen preset="scroll" safeAreaEdges={['top']} testID={testID}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="settings-back"
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Feather name="chevron-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text preset="heading" style={styles.title}>{title}</Text>
      </View>
      {children}
    </Screen>
  )
}

/** Row shared by the settings screens: icon + label (+ value) + chevron. */
export function SettingsItemRow({ icon, label, value, valueColor, external, destructive, last, onPress, testID }: {
  icon: string
  label: string
  value?: string
  valueColor?: string
  /** Show an external-link glyph instead of the chevron. */
  external?: boolean
  /** Tint icon + label in the error color (e.g. "Delete account"). */
  destructive?: boolean
  last?: boolean
  onPress?: () => void
  testID?: string
}) {
  const inner = (
    <>
      <Feather name={icon as any} size={15} color={destructive ? Colors.error : Colors.textMuted} />
      <Text preset="label" color={destructive ? Colors.error : undefined} style={styles.rowLabel}>{label}</Text>
      {!!value && (
        <Text preset="caption" color={valueColor ?? Colors.textMuted} numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      )}
      {!!onPress && (
        <Feather name={external ? 'external-link' : 'chevron-right'} size={16} color={Colors.textMuted} />
      )}
    </>
  )

  if (!onPress) {
    return <View style={[styles.row, !last && styles.rowBorder]}>{inner}</View>
  }

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, !last && styles.rowBorder]}
    >
      {inner}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  back:      { padding: Spacing.xs },
  title:     { flex: 1 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel:  { flex: 1 },
  rowValue:  { flexShrink: 1, maxWidth: '55%' },
})
