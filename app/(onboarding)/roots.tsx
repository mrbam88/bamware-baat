import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, OptionCard } from '../../src/components'
import { useToast } from '../../src/components/ToastProvider'
import { updateMyProfile } from '../../src/api/profile'
import { ROOTS_OPTIONS, MAX_SELECTED_ROOTS, MIN_SELECTED_ROOTS } from '../../src/constants/roots'
import { ONBOARDING_TOTAL_STEPS } from '../../src/constants/onboarding'

export default function OnboardingRootsScreen() {
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [roots, setRoots] = useState<string[]>([])

  const { mutate, isPending } = useMutation({
    mutationFn: (chosen: string[]) => updateMyProfile({ roots: chosen }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      router.push('/(onboarding)/faith')
    },
    onError: () => {
      showToast({ variant: 'error', message: 'Could not save your roots. Try again.' })
    },
  })

  function toggle(value: string) {
    if (roots.includes(value)) {
      setRoots(roots.filter((r) => r !== value))
      return
    }
    if (roots.length >= MAX_SELECTED_ROOTS) {
      showToast({ variant: 'info', message: `You can pick up to ${MAX_SELECTED_ROOTS} places.` })
      return
    }
    setRoots([...roots, value])
  }

  const canContinue = roots.length >= MIN_SELECTED_ROOTS

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable testID="back-button" onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text preset="caption" color={Colors.textMuted}>‹ Back</Text>
          </Pressable>
          <Text preset="heading" style={styles.heading}>Where's your family from?</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
            Step 5 of {ONBOARDING_TOTAL_STEPS} — diaspora kids welcome. Pick every place that raised you.
          </Text>
        </View>

        <View style={styles.options}>
          {ROOTS_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              testID={`roots-${opt.value}`}
              label={opt.label}
              description={opt.description}
              selected={roots.includes(opt.value)}
              onPress={() => toggle(opt.value)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text preset="caption" color={Colors.textMuted} style={styles.counter}>
            {roots.length}/{MAX_SELECTED_ROOTS} selected
          </Text>
          <Button
            testID="roots-continue"
            preset="filled"
            text={isPending ? 'Saving…' : 'Continue'}
            onPress={() => mutate(roots)}
            disabled={!canContinue || isPending}
          />
          {!canContinue ? (
            <Text preset="caption" color={Colors.textMuted} style={styles.hint}>
              Pick at least {MIN_SELECTED_ROOTS} to continue
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
  back:    { alignSelf: 'flex-start', marginBottom: Spacing.xs },
  heading: { letterSpacing: -0.5 },
  sub:     { letterSpacing: 0.2 },
  options: { gap: Spacing.sm },
  footer:  { gap: Spacing.md, marginTop: Spacing.lg },
  counter: { textAlign: 'center' },
  hint:    { textAlign: 'center' },
})
