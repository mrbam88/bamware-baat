/**
 * SSO button block for the auth screens (issue #20).
 *
 * 'or' divider + provider buttons, styled with theme tokens only. Apple is
 * iOS-only (Guideline 4.8 web-flow-on-Android is out of scope); Google
 * renders on both platforms. Hook-free by design so unit tests can invoke it
 * directly (repo convention — see MatchBadge.test.tsx).
 */
import { Platform, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { Colors, Spacing } from '../theme'
import { Button, type ButtonAccessoryProps } from './Button'
import { Text } from './Text'
import type { SocialProvider } from '../api/auth'

export interface SocialAuthButtonsProps {
  /** Invoked with the chosen provider; the screen owns the async flow. */
  onPress: (provider: SocialProvider) => void
  /** Disables both buttons while any auth flow is in flight. */
  disabled?: boolean
}

function AppleIcon({ style }: ButtonAccessoryProps) {
  return <FontAwesome name="apple" size={18} color={Colors.accent} style={style as StyleProp<TextStyle>} />
}

function GoogleIcon({ style }: ButtonAccessoryProps) {
  return <FontAwesome name="google" size={16} color={Colors.accent} style={style as StyleProp<TextStyle>} />
}

export function SocialAuthButtons({ onPress, disabled }: SocialAuthButtonsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text preset="caption" color={Colors.textMuted}>or</Text>
        <View style={styles.line} />
      </View>
      {Platform.OS === 'ios' && (
        <Button
          testID="apple-sso-button"
          preset="outline"
          text="Continue with Apple"
          LeftAccessory={AppleIcon}
          disabled={disabled}
          onPress={() => onPress('apple')}
        />
      )}
      <Button
        testID="google-sso-button"
        preset="outline"
        text="Continue with Google"
        LeftAccessory={GoogleIcon}
        disabled={disabled}
        onPress={() => onPress('google')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  divider:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
  line:      { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.borderLight },
})
