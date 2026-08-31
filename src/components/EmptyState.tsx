import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors, Spacing } from '../theme'
import { Text } from './Text'
import { Button, type ButtonProps } from './Button'

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Feather>['name']
  heading?: string
  body?: string
  button?: string
  onButtonPress?: ButtonProps['onPress']
  ButtonProps?: Partial<ButtonProps>
  style?: StyleProp<ViewStyle>
}

export function EmptyState({
  icon = 'inbox',
  heading,
  body,
  button,
  onButtonPress,
  ButtonProps,
  style,
}: EmptyStateProps) {
  return (
    <View style={[$container, style]}>
      <Feather name={icon} size={48} color={Colors.border} style={{ marginBottom: Spacing.lg }} />

      {!!heading && (
        <Text
          preset="subheading"
          text={heading}
          style={{ textAlign: 'center', marginBottom: Spacing.sm }}
        />
      )}

      {!!body && (
        <Text
          preset="body"
          text={body}
          color={Colors.textMuted}
          style={{ textAlign: 'center', paddingHorizontal: Spacing.lg }}
        />
      )}

      {!!button && (
        <Button
          preset="outline"
          text={button}
          onPress={onButtonPress}
          style={{ marginTop: Spacing.xl }}
          {...ButtonProps}
        />
      )}
    </View>
  )
}

const $container: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: Spacing.xl,
}
