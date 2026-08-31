import { useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Colors, Spacing } from '../../src/theme'
import { Screen, Text, Button, TagSelector } from '../../src/components'
import { useToast } from '../../src/components/ToastProvider'
import { updateMyProfile } from '../../src/api/profile'
import { MAX_SELECTED_TAGS, MIN_SELECTED_TAGS } from '../../src/constants/tags'
import { ONBOARDING_TOTAL_STEPS } from '../../src/constants/onboarding'

export default function OnboardingTagsScreen() {
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [tags, setTags] = useState<string[]>([])

  const { mutate, isPending } = useMutation({
    mutationFn: (chosen: string[]) => updateMyProfile({ tags: chosen }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      router.replace('/(app)/discover')
    },
    onError: () => {
      showToast({ variant: 'error', message: 'Could not save your tags. Try again.' })
    },
  })

  const canContinue = tags.length >= MIN_SELECTED_TAGS

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
      <View style={styles.inner}>
        <View style={styles.header}>
          {router.canGoBack() ? (
            <Pressable testID="back-button" onPress={() => router.back()} hitSlop={12} style={styles.back}>
              <Text preset="caption" color={Colors.textMuted}>‹ Back</Text>
            </Pressable>
          ) : null}
          <Text preset="display" style={styles.heading}>Pick your interests</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
            Step 8 of {ONBOARDING_TOTAL_STEPS} — pick {MIN_SELECTED_TAGS}–{MAX_SELECTED_TAGS} so we can match you.
          </Text>
        </View>

        <TagSelector selected={tags} onChange={setTags} />

        <View style={styles.footer}>
          <Text preset="caption" color={Colors.textMuted} style={styles.counter}>
            {tags.length}/{MAX_SELECTED_TAGS} selected
          </Text>
          <Button
            testID="tags-finish"
            preset="filled"
            text={isPending ? 'Saving…' : 'Finish'}
            onPress={() => mutate(tags)}
            disabled={!canContinue || isPending}
          />
          {!canContinue ? (
            <Text preset="caption" color={Colors.textMuted} style={styles.hint}>
              Pick at least {MIN_SELECTED_TAGS} to continue
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
  heading: { letterSpacing: -1 },
  sub:     { letterSpacing: 0.2 },
  footer:  { gap: Spacing.md, marginTop: Spacing.lg },
  counter: { textAlign: 'center' },
  hint:    { textAlign: 'center' },
})
