import { forwardRef, useRef } from 'react'
import type { ComponentType } from 'react'
import {
  TextInput, type TextInputProps, TouchableOpacity,
  View, type ViewStyle, type TextStyle, type StyleProp, type ImageStyle,
} from 'react-native'
import { Colors, Spacing, Radius } from '../theme'
import { Text, type TextProps } from './Text'

export interface TextFieldAccessoryProps {
  style: StyleProp<ViewStyle | TextStyle | ImageStyle>
  status: TextFieldProps['status']
  multiline: boolean
  editable: boolean
}

export interface TextFieldProps extends Omit<TextInputProps, 'ref'> {
  status?: 'error' | 'disabled'
  label?: string
  LabelTextProps?: TextProps
  helper?: string
  HelperTextProps?: TextProps
  containerStyle?: StyleProp<ViewStyle>
  inputWrapperStyle?: StyleProp<ViewStyle>
  RightAccessory?: ComponentType<TextFieldAccessoryProps>
  LeftAccessory?: ComponentType<TextFieldAccessoryProps>
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(props, ref) {
  const {
    label,
    helper,
    status,
    RightAccessory,
    LeftAccessory,
    LabelTextProps,
    HelperTextProps,
    containerStyle,
    inputWrapperStyle,
    style: inputStyleOverride,
    ...textInputProps
  } = props

  const inputRef = useRef<TextInput>(null)
  const disabled = textInputProps.editable === false || status === 'disabled'
  const isError  = status === 'error'

  return (
    <View style={containerStyle} accessibilityState={{ disabled }}>
      {!!label && (
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} disabled={disabled}>
          <Text
            preset="label"
            text={label}
            color={isError ? Colors.error : Colors.textSecondary}
            {...LabelTextProps}
            style={[$labelStyle, LabelTextProps?.style]}
          />
        </TouchableOpacity>
      )}

      <View style={[
        $inputWrapper,
        isError && { borderColor: Colors.error },
        textInputProps.multiline && { minHeight: 100, alignItems: 'flex-start' },
        LeftAccessory && { paddingStart: 0 },
        RightAccessory && { paddingEnd: 0 },
        inputWrapperStyle,
      ]}>
        {!!LeftAccessory && (
          <LeftAccessory
            style={$leftAcc}
            status={status}
            editable={!disabled}
            multiline={textInputProps.multiline ?? false}
          />
        )}

        <TextInput
          ref={ref ?? inputRef}
          underlineColorAndroid="transparent"
          textAlignVertical="top"
          placeholderTextColor={Colors.textMuted}
          {...textInputProps}
          editable={!disabled}
          style={[$input, disabled && { color: Colors.textMuted }, inputStyleOverride]}
        />

        {!!RightAccessory && (
          <RightAccessory
            style={$rightAcc}
            status={status}
            editable={!disabled}
            multiline={textInputProps.multiline ?? false}
          />
        )}
      </View>

      {!!helper && (
        <Text
          preset="caption"
          text={helper}
          color={isError ? Colors.error : Colors.textMuted}
          {...HelperTextProps}
          style={[$helperStyle, HelperTextProps?.style]}
        />
      )}
    </View>
  )
})

const $labelStyle: TextStyle  = { marginBottom: Spacing.xs }
const $helperStyle: TextStyle = { marginTop: Spacing.xs }

const $inputWrapper: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  height: 52,
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.md,
  overflow: 'hidden',
}

const $input: TextStyle = {
  flex: 1,
  fontFamily: 'Manrope_400Regular',
  fontSize: 16,
  color: Colors.textPrimary,
  paddingHorizontal: Spacing.md,
}

const $leftAcc: ViewStyle  = { marginLeft: Spacing.sm, height: 40, justifyContent: 'center', alignItems: 'center' }
const $rightAcc: ViewStyle = { marginRight: Spacing.sm, height: 40, justifyContent: 'center', alignItems: 'center' }
