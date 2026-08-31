import { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Colors, Spacing, Radius } from '../../src/theme'
import { Screen, Text, Button, TextField } from '../../src/components'
import { useToast } from '../../src/components/ToastProvider'
import {
  createProfile,
  type Borough,
  type CreateProfileRequest,
  type Gender,
  type Seeking,
} from '../../src/api/profile'
import { ONBOARDING_TOTAL_STEPS } from '../../src/constants/onboarding'

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'man',       label: 'Man' },
  { value: 'woman',     label: 'Woman' },
  { value: 'nonbinary', label: 'Nonbinary' },
]

const SEEKING_OPTIONS: { value: Seeking; label: string }[] = [
  { value: 'men',      label: 'Men' },
  { value: 'women',    label: 'Women' },
  { value: 'everyone', label: 'Everyone' },
]

const BOROUGH_OPTIONS: { value: Borough; label: string }[] = [
  { value: 'manhattan',      label: 'Manhattan' },
  { value: 'brooklyn',       label: 'Brooklyn' },
  { value: 'queens',         label: 'Queens' },
  { value: 'bronx',          label: 'Bronx' },
  { value: 'staten_island',  label: 'Staten Island' },
]

type ChipsProps<T extends string> = {
  options: { value: T; label: string }[]
  selected: T | null
  onSelect: (v: T) => void
  testID?: string
}

function Chips<T extends string>({ options, selected, onSelect, testID }: ChipsProps<T>) {
  return (
    <View style={styles.chips} testID={testID}>
      {options.map((opt) => {
        const active = selected === opt.value
        return (
          <Pressable
            key={opt.value}
            testID={`${testID}-${opt.value}`}
            onPress={() => onSelect(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text
              preset="caption"
              color={active ? Colors.bg : Colors.textPrimary}
              style={styles.chipText}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

type Errors = {
  age?: string
  gender?: string
  seeking?: string
  borough?: string
  bio?: string
  form?: string
}

export default function OnboardingProfileScreen() {
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [ageText, setAgeText]   = useState('')
  const [gender, setGender]     = useState<Gender | null>(null)
  const [seeking, setSeeking]   = useState<Seeking | null>(null)
  const [borough, setBorough]   = useState<Borough | null>(null)
  const [bio, setBio]           = useState('')
  const [errors, setErrors]     = useState<Errors>({})

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateProfileRequest) => createProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      router.replace('/(onboarding)/photos')
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        // Profile already exists — user can proceed to next step
        showToast({ variant: 'info', message: 'Profile already exists. Continuing…' })
        queryClient.invalidateQueries({ queryKey: ['my-profile'] })
        router.replace('/(onboarding)/photos')
        return
      }
      setErrors({ form: 'Could not save your profile. Please try again.' })
    },
  })

  function handleContinue() {
    const next: Errors = {}
    const age = parseInt(ageText, 10)
    if (!ageText.trim()) next.age = 'Required'
    else if (Number.isNaN(age) || age < 18 || age > 99) next.age = 'Must be between 18 and 99'
    if (!gender)  next.gender  = 'Pick one'
    if (!seeking) next.seeking = 'Pick one'
    if (!borough) next.borough = 'Pick one'
    if (bio.length > 300) next.bio = 'Max 300 characters'
    if (Object.keys(next).length) { setErrors(next); return }

    setErrors({})
    mutate({
      age,
      gender:  gender!,
      seeking: seeking!,
      borough: borough!,
      bio:     bio.trim() || undefined,
    })
  }

  return (
    <Screen preset="scroll" safeAreaEdges={['top', 'bottom']} keyboardOffset={20}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text preset="display" style={styles.heading}>Tell us about you</Text>
          <Text preset="caption" color={Colors.textMuted} style={styles.sub}>
            Step 1 of {ONBOARDING_TOTAL_STEPS} — the basics first. Photos, culture, and interests next.
          </Text>
        </View>

        <View style={styles.section}>
          <TextField
            testID="age-input"
            label="Age"
            placeholder="25"
            keyboardType="number-pad"
            value={ageText}
            onChangeText={setAgeText}
            status={errors.age ? 'error' : undefined}
            helper={errors.age}
          />
        </View>

        <View style={styles.section}>
          <Text preset="caption" color={Colors.textSecondary} style={styles.fieldLabel}>I am a</Text>
          <Chips testID="gender" options={GENDER_OPTIONS} selected={gender} onSelect={setGender} />
          {errors.gender ? <Text preset="caption" color={Colors.error}>{errors.gender}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text preset="caption" color={Colors.textSecondary} style={styles.fieldLabel}>Looking for</Text>
          <Chips testID="seeking" options={SEEKING_OPTIONS} selected={seeking} onSelect={setSeeking} />
          {errors.seeking ? <Text preset="caption" color={Colors.error}>{errors.seeking}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text preset="caption" color={Colors.textSecondary} style={styles.fieldLabel}>Borough</Text>
          <Chips testID="borough" options={BOROUGH_OPTIONS} selected={borough} onSelect={setBorough} />
          {errors.borough ? <Text preset="caption" color={Colors.error}>{errors.borough}</Text> : null}
        </View>

        <View style={styles.section}>
          <TextField
            testID="bio-input"
            label="Bio (optional)"
            placeholder="Say something about yourself"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={300}
            status={errors.bio ? 'error' : undefined}
            helper={errors.bio || `${bio.length}/300`}
          />
        </View>

        {errors.form ? (
          <Text preset="caption" color={Colors.error} style={styles.formError}>{errors.form}</Text>
        ) : null}

        <Button
          preset="filled"
          text={isPending ? 'Saving…' : 'Continue'}
          onPress={handleContinue}
          disabled={isPending}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner:      { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  header:     { gap: Spacing.sm, marginBottom: Spacing.md },
  heading:    { letterSpacing: -1 },
  sub:        { letterSpacing: 0.2 },
  section:    { gap: Spacing.sm },
  fieldLabel: { letterSpacing: 0.2 },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip:       { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText:   { letterSpacing: 0.2 },
  formError:  { textAlign: 'center' },
})
