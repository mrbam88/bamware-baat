import { Pressable, View, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors, Radius, Spacing } from '../theme'
import { Text } from './Text'

export interface OptionCardProps {
  label: string
  description: string
  selected: boolean
  onPress: () => void
  testID?: string
}

/**
 * Selectable option card for the onboarding cultural steps (issue #3):
 * label + description + trailing check indicator. Single- vs multi-select
 * semantics live in the parent screen; this is purely presentational.
 */
export function OptionCard({ label, description, selected, onPress, testID }: OptionCardProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <Text preset="label" weight="semibold" color={selected ? Colors.accent : Colors.textPrimary}>
          {label}
        </Text>
        <Text preset="caption" color={Colors.textMuted} style={styles.description}>
          {description}
        </Text>
      </View>
      <View style={[styles.check, selected && styles.checkSelected]}>
        {selected ? <Feather name="check" size={14} color={Colors.onAccent} /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surfaceHigh,
  },
  pressed: { opacity: 0.85 },
  copy: { flex: 1, gap: 2 },
  description: { letterSpacing: 0.2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
})
