import type { ComponentType, ReactNode } from 'react'
import {
  Platform, Pressable, type PressableProps, type PressableStateCallbackType,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native'
import { Colors, Radius, Spacing } from '../theme'
import { Text } from './Text'

type Preset = 'filled' | 'outline' | 'ghost' | 'destructive'

export interface ButtonAccessoryProps {
  style: StyleProp<ViewStyle>
  pressed: boolean
  disabled?: boolean
}

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  text?: string
  style?: StyleProp<ViewStyle>
  pressedStyle?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  preset?: Preset
  LeftAccessory?: ComponentType<ButtonAccessoryProps>
  RightAccessory?: ComponentType<ButtonAccessoryProps>
  disabled?: boolean
  disabledStyle?: StyleProp<ViewStyle>
  children?: ReactNode
}

export function Button(props: ButtonProps) {
  const {
    text,
    style,
    pressedStyle,
    textStyle,
    preset = 'filled',
    LeftAccessory,
    RightAccessory,
    disabled,
    disabledStyle,
    children,
    ...rest
  } = props

  const isFilled = preset === 'filled'

  function containerStyle(state: PressableStateCallbackType): StyleProp<ViewStyle> {
    return [
      $base,
      PRESET_CONTAINER[preset],
      style,
      state.pressed && [$pressed, pressedStyle],
      disabled && [$disabled, disabledStyle],
    ]
  }

  function labelColor(): string {
    // Dark espresso text on the gold fill — the Baat CTA signature
    if (isFilled) return Colors.onAccent
    if (preset === 'destructive') return Colors.textPrimary
    return Colors.accent
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      android_ripple={
        Platform.OS === 'android' && !disabled
          ? { color: isFilled ? 'rgba(28,22,16,0.15)' : 'rgba(201,168,106,0.15)' }
          : undefined
      }
      style={containerStyle}
      {...rest}
    >
      {(state) => (
        <>
          {!!LeftAccessory && <LeftAccessory style={$leftAcc} pressed={state.pressed} disabled={disabled} />}
          <Text preset="label" weight="bold" color={labelColor()} style={textStyle}>
            {text ?? children}
          </Text>
          {!!RightAccessory && <RightAccessory style={$rightAcc} pressed={state.pressed} disabled={disabled} />}
        </>
      )}
    </Pressable>
  )
}

const $base: ViewStyle = {
  minHeight: 52,
  borderRadius: Radius.pill,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  overflow: 'hidden',
  paddingHorizontal: Spacing.lg,
}

const PRESET_CONTAINER: Record<Preset, ViewStyle> = {
  filled:      { backgroundColor: Colors.accent },
  outline:     { borderWidth: 1.5, borderColor: Colors.accent },
  ghost:       {},
  destructive: { backgroundColor: Colors.error },
}

const $pressed: ViewStyle  = { opacity: 0.82, transform: [{ scale: 0.98 }] }
const $disabled: ViewStyle = { opacity: 0.45 }
const $leftAcc: ViewStyle  = { marginRight: Spacing.sm }
const $rightAcc: ViewStyle = { marginLeft: Spacing.sm }
