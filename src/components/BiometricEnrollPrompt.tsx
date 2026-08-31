import { Modal, View, type ViewStyle, type TextStyle } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { Colors, Radius, Spacing } from '../theme'
import { Text } from './Text'
import { Button } from './Button'

/**
 * "Enable Face ID sign-in?" offer (issue #17).
 *
 * Mounted once at the root layout: the offer is queued by authStore.login
 * right before AuthGate navigates away from the login screen, so the modal
 * must live above the router — a login-screen-local modal would unmount
 * mid-offer.
 */
export function BiometricEnrollPrompt() {
  const offer = useAuthStore((s) => s.biometricOffer)
  const accept = useAuthStore((s) => s.acceptBiometricOffer)
  const decline = useAuthStore((s) => s.declineBiometricOffer)

  if (!offer) return null

  return (
    <Modal transparent animationType="fade" visible onRequestClose={decline}>
      <View style={$backdrop}>
        <View style={$card} testID="biometric-enroll-modal">
          <Text preset="heading" style={$title}>
            Enable {offer.label} sign-in?
          </Text>
          <Text preset="body" color={Colors.textSecondary} style={$body}>
            Skip the keyboard next time — sign in to Baat with {offer.label}. Your
            credentials stay on this device, locked behind {offer.label}.
          </Text>
          <View style={$actions}>
            <Button
              preset="filled"
              testID="biometric-enroll-accept"
              text={`Enable ${offer.label}`}
              onPress={() => { void accept() }}
            />
            <Button
              preset="ghost"
              testID="biometric-enroll-decline"
              text="Not now"
              onPress={() => { void decline() }}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const $backdrop: ViewStyle = {
  flex: 1,
  backgroundColor: Colors.overlay,
  justifyContent: 'center',
  paddingHorizontal: Spacing.xl,
}

const $card: ViewStyle = {
  backgroundColor: Colors.surfaceHigh,
  borderRadius: Radius.lg,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.lg,
}

const $title: TextStyle = { marginBottom: Spacing.sm }
const $body: TextStyle = { marginBottom: Spacing.lg }
const $actions: ViewStyle = { gap: Spacing.sm }
