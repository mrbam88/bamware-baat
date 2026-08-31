import type { ReactNode } from 'react'
import {
  TouchableOpacity, type TouchableOpacityProps,
  View, type ViewStyle, type StyleProp, type TextStyle,
} from 'react-native'
import { Colors, Spacing, Radius } from '../theme'
import { Text, type TextProps } from './Text'

type Preset = 'default' | 'elevated'
type VerticalAlignment = 'top' | 'center' | 'space-between' | 'force-footer-bottom'

export interface CardProps extends TouchableOpacityProps {
  preset?: Preset
  verticalAlignment?: VerticalAlignment
  LeftComponent?: ReactNode
  RightComponent?: ReactNode
  heading?: string
  headingStyle?: StyleProp<TextStyle>
  HeadingTextProps?: TextProps
  content?: string
  contentStyle?: StyleProp<TextStyle>
  ContentTextProps?: TextProps
  footer?: string
  footerStyle?: StyleProp<TextStyle>
  FooterTextProps?: TextProps
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

export function Card(props: CardProps) {
  const {
    preset = 'default',
    verticalAlignment = 'top',
    LeftComponent,
    RightComponent,
    heading,
    headingStyle,
    HeadingTextProps,
    content,
    contentStyle,
    ContentTextProps,
    footer,
    footerStyle,
    FooterTextProps,
    style,
    children,
    onPress,
    ...rest
  } = props

  const isPressable = !!onPress
  const hasHeading = !!heading
  const hasContent = !!content || !!children
  const hasFooter  = !!footer

  const Wrapper = isPressable ? TouchableOpacity : View

  return (
    <Wrapper
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole={isPressable ? 'button' : undefined}
      style={[
        $container,
        preset === 'elevated' && $elevated,
        style,
      ]}
      {...(rest as any)}
    >
      {LeftComponent}

      <View style={[$inner, { justifyContent: ALIGNMENT[verticalAlignment] }]}>
        {hasHeading && (
          <Text
            preset="label"
            weight="bold"
            text={heading}
            {...HeadingTextProps}
            style={[hasContent && { marginBottom: Spacing.xs }, headingStyle, HeadingTextProps?.style]}
          />
        )}

        {children ?? (hasContent && (
          <Text
            preset="body"
            text={content}
            color={Colors.textSecondary}
            {...ContentTextProps}
            style={[hasHeading && { marginTop: Spacing.xs }, hasFooter && { marginBottom: Spacing.xs }, contentStyle, ContentTextProps?.style]}
          />
        ))}

        {hasFooter && (
          <Text
            preset="caption"
            text={footer}
            color={Colors.textMuted}
            {...FooterTextProps}
            style={[(hasHeading || hasContent) && { marginTop: Spacing.xs }, footerStyle, FooterTextProps?.style]}
          />
        )}
      </View>

      {RightComponent}
    </Wrapper>
  )
}

const ALIGNMENT: Record<VerticalAlignment, ViewStyle['justifyContent']> = {
  'top':                'flex-start',
  'center':             'center',
  'space-between':      'space-between',
  'force-footer-bottom': 'space-between',
}

const $container: ViewStyle = {
  flexDirection: 'row',
  backgroundColor: Colors.surface,
  borderRadius: Radius.lg,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  overflow: 'hidden',
}

const $elevated: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 6,
}

const $inner: ViewStyle = {
  flex: 1,
  alignSelf: 'stretch',
}
