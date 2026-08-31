import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, OptionCard } from '../../src/components'
import { useToast } from '../../src/components/ToastProvider'
import { updateMyProfile } from '../../src/api/profile'
import {
  LANGUAGE_OPTIONS,
  MAX_SELECTED_LANGUAGES,
  MIN_SELECTED_LANGUAGES,
} from '../../src/constants/languages'
import { ONBOARDING_TOTAL_STEPS } from '../../src/constants/onboarding'

export default function OnboardingLanguagesScreen() {
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [languages, setLanguages] = useState<string[]>([])

  const { mutate, isPending } = useMutation({
    mutationFn: (chosen: string[]) => updateMyProfile({ languages: chosen }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      router.push('/(onboarding)/roots')
    },
    onError: () => {
      showToast({ variant: 'error', message: 'Could not save your languages. Try again.' })
    },
  })

  function toggle(value: string) {
    if (languages.includes(value)) {
      setLanguages(languages.filter((l) => l !== value))
      return
    }
    if (languages.length >= MAX_SELECTED_LANGUAGES) {
      showToast({ variant: 'info', message: `You can pick up to ${MAX_SELECTED_LANGUAGES} languages.` })
      return
    }
    setLanguages([...languages, value])
  }

  const canContinue = languages.length >= MIN_SELECTED_LANGUAGES

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Pressable testID="back-button" onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text preset="caption" color={Colors.textMuted}>‹ Back</Text>
          </Pressable>
          <Text preset="heading" style={styles.heading}>Languages that feel like home</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
            Step 4 of {ONBOARDING_TOTAL_STEPS} — pick up to {MAX_SELECTED_LANGUAGES}. Rusty vocab and accents fully welcome.
          </Text>
        </View>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <OptionCard
              key={opt.value}
              testID={`language-${opt.value}`}
              label={opt.label}
              description={opt.description}
              selected={languages.includes(opt.value)}
              onPress={() => toggle(opt.value)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text preset="caption" color={Colors.textMuted} style={styles.counter}>
            {languages.length}/{MAX_SELECTED_LANGUAGES} selected
          </Text>
          <Button
            testID="languages-continue"
            preset="filled"
            text={isPending ? 'Saving…' : 'Continue'}
            onPress={() => mutate(languages)}
            disabled={!canContinue || isPending}
          />
          {!canContinue ? (
            <Text preset="caption" color={Colors.textMuted} style={styles.hint}>
              Pick at least {MIN_SELECTED_LANGUAGES} to continue
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
