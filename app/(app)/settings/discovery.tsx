import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { datingClient } from '../../../src/api/client'
import { getMyProfile, type Profile, type Seeking } from '../../../src/api/profile'
import * as storage from '../../../src/lib/storage'
import { Colors, Radius, Spacing } from '../../../src/theme'
import { Button, Card, Text } from '../../../src/components'
import { useToast } from '../../../src/components/ToastProvider'
import { SettingsScreen } from './_layout'

/**
 * Discovery preferences. `seeking` persists server-side today; ageMin/ageMax/
 * maxDistance ride along in the same PATCH /profile/me (the API strips
 * unknown keys until the backend schema adds them) and are mirrored locally
 * so the sliders stay sticky across sessions in the meantime.
 */
const PREFS_KEY = 'discovery_prefs'

const AGE_FLOOR = 18
const AGE_CEIL = 99
const DIST_MIN = 1
const DIST_MAX = 50

const SEEKING_OPTIONS: { value: Seeking; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'everyone', label: 'Everyone' },
]

/** Numeric prefs the backend doesn't store yet — mirrored in secure storage. */
type LocalPrefs = { ageMin?: number; ageMax?: number; maxDistance?: number }

export default function DiscoverySettingsScreen() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile })

  const [seeking, setSeeking] = useState<Seeking>('everyone')
  const [ageMin, setAgeMin] = useState(21)
  const [ageMax, setAgeMax] = useState(45)
  const [maxDistance, setMaxDistance] = useState(10)

  // Seed from the server profile once it arrives (seeking today; the numeric
  // prefs too once the backend starts returning them).
  const seededFromProfile = useRef(false)
  useEffect(() => {
    if (!profile || seededFromProfile.current) return
    seededFromProfile.current = true
    setSeeking(profile.seeking)
    const p = profile as Profile & LocalPrefs
    if (typeof p.ageMin === 'number') setAgeMin(p.ageMin)
    if (typeof p.ageMax === 'number') setAgeMax(p.ageMax)
    if (typeof p.maxDistance === 'number') setMaxDistance(p.maxDistance)
  }, [profile])

  // Seed the numeric prefs from the local mirror. Both sources are written
  // together on save, so ordering between the two seeds doesn't matter.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const raw = await storage.getItem(PREFS_KEY)
      if (!raw || cancelled) return
      try {
        const saved: LocalPrefs = JSON.parse(raw)
        if (typeof saved.ageMin === 'number') setAgeMin(saved.ageMin)
        if (typeof saved.ageMax === 'number') setAgeMax(saved.ageMax)
        if (typeof saved.maxDistance === 'number') setMaxDistance(saved.maxDistance)
      } catch {
        // Corrupted mirror — fall back to defaults.
      }
    })()
    return () => { cancelled = true }
  }, [])

  const { mutate: savePrefs, isPending: saving } = useMutation({
    mutationFn: async () => {
      await datingClient.patch('/profile/me', { seeking, ageMin, ageMax, maxDistance })
      await storage.setItem(PREFS_KEY, JSON.stringify({ ageMin, ageMax, maxDistance }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      showToast({ variant: 'success', message: 'Preferences saved!' })
    },
    onError: () => showToast({ variant: 'error', message: 'Failed to save preferences.' }),
  })

  return (
    <SettingsScreen title="Discovery" testID="settings-discovery">
      <View style={styles.section}>
        <Text preset="subheading">Seeking</Text>
        <View style={styles.pillRow}>
          {SEEKING_OPTIONS.map((opt) => {
            const active = seeking === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                testID={`seeking-${opt.value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                activeOpacity={0.8}
                onPress={() => setSeeking(opt.value)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text preset="label" color={active ? Colors.onAccent : Colors.textSecondary}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">Age range</Text>
        <Card>
          <View>
            <PrefSlider
              testID="slider-age-min"
              label="Minimum age"
              value={ageMin}
              min={AGE_FLOOR}
              max={AGE_CEIL}
              onChange={(v) => setAgeMin(Math.min(v, ageMax))}
            />
            <PrefSlider
              testID="slider-age-max"
              label="Maximum age"
              value={ageMax}
              min={AGE_FLOOR}
              max={AGE_CEIL}
              onChange={(v) => setAgeMax(Math.max(v, ageMin))}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text preset="subheading">Distance</Text>
        <Card>
          <PrefSlider
            testID="slider-distance"
            label="Maximum distance"
            value={maxDistance}
            min={DIST_MIN}
            max={DIST_MAX}
            formatValue={(v) => `${v} mi`}
            onChange={setMaxDistance}
          />
        </Card>
      </View>

      <Button
        testID="save-discovery"
        preset="filled"
        text={saving ? 'Saving…' : 'Save preferences'}
        onPress={() => savePrefs()}
        disabled={saving}
        style={styles.saveButton}
      />
    </SettingsScreen>
  )
}

/**
 * Minimal pure-JS slider (PanResponder) — no native slider dependency in
 * this repo, and adding one would force a dev-client rebuild.
 */
function PrefSlider({ label, value, min, max, step = 1, formatValue, onChange, testID }: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  formatValue?: (v: number) => string
  onChange: (v: number) => void
  testID?: string
}) {
  const trackWidth = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const responder = useMemo(() => {
    function handle(x: number) {
      if (trackWidth.current <= 0) return
      const ratio = Math.min(1, Math.max(0, x / trackWidth.current))
      const stepped = Math.round((min + ratio * (max - min)) / step) * step
      onChangeRef.current(Math.min(max, Math.max(min, stepped)))
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture even when the parent ScrollView wants it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => handle(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handle(evt.nativeEvent.locationX),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step])

  const ratio = (value - min) / (max - min)

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text preset="label" color={Colors.textSecondary}>{label}</Text>
        <Text preset="label" color={Colors.accent}>
          {formatValue ? formatValue(value) : String(value)}
        </Text>
      </View>
      <View
        testID={testID}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        style={styles.sliderTouchArea}
        onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width }}
        {...responder.panHandlers}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${ratio * 100}%` as const }]} />
        </View>
        <View style={[styles.sliderThumb, { left: `${ratio * 100}%` as const }]} />
      </View>
    </View>
  )
}

const THUMB_SIZE = 22

const styles = StyleSheet.create({
  section:    { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  pillRow:    { flexDirection: 'row', gap: Spacing.sm },
  pill:       {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  saveButton: { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },

  sliderBlock:     { paddingVertical: Spacing.sm, gap: Spacing.sm },
  sliderHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sliderTouchArea: { height: 36, justifyContent: 'center' },
  sliderTrack:     { height: 4, borderRadius: Radius.full, backgroundColor: Colors.border, overflow: 'hidden' },
  sliderFill:      { height: '100%', backgroundColor: Colors.accent, borderRadius: Radius.full },
  sliderThumb:     {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginLeft: -THUMB_SIZE / 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentBright,
    borderWidth: 2,
    borderColor: Colors.surfaceHigh,
  },
})
