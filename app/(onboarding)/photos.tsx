import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, PhotoManager } from '../../src/components'
import { ONBOARDING_TOTAL_STEPS } from '../../src/constants/onboarding'

const MIN_PHOTOS = 1

export default function OnboardingPhotosScreen() {
  const router = useRouter()
  const [photos, setPhotos] = useState<string[]>([])

  const canContinue = photos.length >= MIN_PHOTOS

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text preset="display" style={styles.heading}>Add some photos</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
            Step 2 of {ONBOARDING_TOTAL_STEPS} — tap a tile to upload. Long-press to remove.
          </Text>
        </View>

        <PhotoManager photos={photos} onPhotosChange={setPhotos} />

        <View style={styles.actions}>
          <Button
            testID="photos-continue"
            preset="filled"
            text="Continue"
            // push (not replace) so the cultural steps can navigate back here
            onPress={() => router.push('/(onboarding)/looking-for')}
            disabled={!canContinue}
          />
          {!canContinue ? (
            <Text preset="caption" color={Colors.textMuted} style={styles.hint}>
              Add at least {MIN_PHOTOS} photo to continue
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner:   { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  header:  { gap: Spacing.sm },
  heading: { letterSpacing: -1 },
  sub:     { letterSpacing: 0.2 },
  actions: { gap: Spacing.md, marginTop: Spacing.lg },
  hint:    { textAlign: 'center' },
})
