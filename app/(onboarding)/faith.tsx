import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, OptionCard } from '../../src/components'
import { useToast } from '../../src/components/ToastProvider'
import { updateMyProfile, type Faith } from '../../src/api/profile'
import { FAITH_OPTIONS } from '../../src/constants/faith'
import { ONBOARDING_TOTAL_STEPS } from '../../src/constants/onboarding'

export default function OnboardingFaithScreen() {
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [choice, setChoice] = useState<Faith | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (faith: Faith) => updateMyProfile({ faith }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      router.push('/(onboarding)/family')
    },
    onError: () => {
      showToast({ variant: 'error', message: 'Could not save your answer. Try again.' })
    },
  })

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable testID="back-button" onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text preset="caption" color={Colors.textMuted}>‹ Back</Text>
          </Pressable>
          <Text preset="heading" style={styles.heading}>Faith & beliefs</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
            Step 6 of {ONBOARDING_TOTAL_STEPS} — practicing, cultural, or somewhere in between. No wrong answer.
          </Text>
        </View>

        <View style={styles.options}>
          {FAITH_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              testID={`faith-${opt.value}`}
              label={opt.label}
              description={opt.description}
              selected={choice === opt.value}
              onPress={() => setChoice(opt.value)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Button
            testID="faith-continue"
            preset="filled"
            text={isPending ? 'Saving…' : 'Continue'}
            onPress={() => choice && mutate(choice)}
            disabled={!choice || isPending}
          />
          {!choice ? (
            <Text preset="caption" color={Colors.textMuted} style={styles.hint}>
              Pick one to continue
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
  hint:    { textAlign: 'center' },
})
