import type { ReactNode } from 'react'
import { Text as RNText, type TextProps as RNTextProps, type StyleProp, type TextStyle } from 'react-native'
import { Colors, Fonts, FontSize } from '../theme'

type Preset = 'display' | 'displayItalic' | 'heading' | 'subheading' | 'body' | 'label' | 'caption' | 'bold'
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold'

const FONT_FAMILY: Record<Weight, string> = {
  regular:   Fonts.regular,
  medium:    Fonts.medium,
  semibold:  Fonts.semibold,
  bold:      Fonts.bold,
  extrabold: Fonts.extrabold,
}

const PRESET_STYLES: Record<Preset, TextStyle> = {
  // Editorial serif headlines — the Baat signature
  display:       { fontFamily: Fonts.display,       fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  displayItalic: { fontFamily: Fonts.displayItalic, fontSize: 40, lineHeight: 46, letterSpacing: -0.5, fontStyle: 'italic' },
  heading:       { fontFamily: Fonts.display,       fontSize: FontSize.xxl, lineHeight: 36 },
  // Sans for UI text
  subheading:    { fontFamily: Fonts.semibold,      fontSize: FontSize.xl,  lineHeight: 28 },
  body:          { fontFamily: Fonts.regular,       fontSize: FontSize.md,  lineHeight: 24 },
  bold:          { fontFamily: Fonts.bold,          fontSize: FontSize.md,  lineHeight: 24 },
  label:         { fontFamily: Fonts.semibold,      fontSize: FontSize.sm,  lineHeight: 20 },
  caption:       { fontFamily: Fonts.regular,       fontSize: FontSize.xs,  lineHeight: 18 },
}

export interface TextProps extends RNTextProps {
  preset?: Preset
  weight?: Weight
  color?: string
  style?: StyleProp<TextStyle>
  children?: ReactNode
  text?: string
}

export function Text({ preset = 'body', weight, color, text, style, children, maxFontSizeMultiplier = 1.2, ...rest }: TextProps) {
  const presetStyle = PRESET_STYLES[preset]
  const weightStyle = weight ? { fontFamily: FONT_FAMILY[weight] } : {}

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[{ color: color ?? Colors.textPrimary }, presetStyle, weightStyle, style]}
      {...rest}
    >
      {text ?? children}
    </RNText>
  )
}
