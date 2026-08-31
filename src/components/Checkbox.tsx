import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors, Radius, Spacing } from '../theme'
import { Text } from './Text'

export interface CheckboxProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  disabled?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** Theme-token checkbox — gold fill when checked, espresso check mark. */
export function Checkbox({ checked, onChange, label, disabled, testID, style }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: !!disabled }}
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      style={[$row, disabled && $disabled, style]}
    >
      <View style={[$box, checked && $boxChecked]}>
        {checked && <Feather name="check" size={15} color={Colors.onAccent} />}
      </View>
      {!!label && (
        <Text preset="label" weight="medium" color={Colors.textSecondary}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const $row: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.sm,
  alignSelf: 'flex-start',
}

const $box: ViewStyle = {
  width: 22,
  height: 22,
  borderRadius: Radius.sm,
  borderWidth: 1.5,
  borderColor: Colors.borderLight,
  backgroundColor: Colors.surface,
  alignItems: 'center',
  justifyContent: 'center',
}

const $boxChecked: ViewStyle = {
  backgroundColor: Colors.accent,
  borderColor: Colors.accent,
}

const $disabled: ViewStyle = { opacity: 0.45 }
