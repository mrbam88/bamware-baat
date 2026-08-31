import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Colors, Fonts, FontSize, Radius, Spacing } from '../theme'

interface Props {
  /** Compatibility score 0–100. Badge renders nothing when absent or invalid. */
  score?: number
  /** Positioning overrides from the parent card (the badge only styles itself). */
  style?: StyleProp<ViewStyle>
}

/**
 * Pure label formatter — exported for unit tests.
 * Returns null when there is no valid score (old API responses omit it).
 */
export function matchBadgeLabel(score?: number): string | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  const clamped = Math.min(100, Math.max(0, Math.round(score)))
  return `${clamped}% MATCH`
}

/**
 * Gold compatibility badge — "87% MATCH" — shown on discover cards.
 * Design ref: Baat.html "{{score}}% MATCH" ring. Renders nothing without a score.
 */
export function MatchBadge({ score, style }: Props) {
  const label = matchBadgeLabel(score)
  if (label === null) return null

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    fontFamily: Fonts.extrabold,
    fontSize: FontSize.xs,
    color: Colors.onAccent,
    letterSpacing: 0.8,
  },
})
