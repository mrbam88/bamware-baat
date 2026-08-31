import { useState } from 'react'
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { swipe, type Profile } from '../../../src/api/discover'
import { getCachedProfile } from '../../../src/lib/profileCache'
// Direct file imports (not the barrel) so unit tests can require this module
// with a minimal mock surface — same reason MatchBadge.test.tsx invokes
// components directly.
import { MatchBadge } from '../../../src/components/MatchBadge'
import { Text } from '../../../src/components/Text'
import { useToast } from '../../../src/components/ToastProvider'
import { Colors, Fonts, FontSize, Radius, Spacing } from '../../../src/theme'
import tenant from '../../../src/config/app.config'

const SCREEN_WIDTH = Dimensions.get('window').width
const PHOTO_HEIGHT = SCREEN_WIDTH * 1.15

// Catalog-aware label (issue #13): known promptIds get their full prompt text,
// unknown ones fall back to a humanized slug. Re-exported for unit tests.
export { promptLabel } from '../../../src/constants/prompts'
import { promptLabel } from '../../../src/constants/prompts'

/** "staten_island" → "Staten Island". Exported for unit tests. */
export function boroughLabel(borough: string): string {
  return borough
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

interface ProfileDetailProps {
  profile: Profile
  photoIndex: number
  onPhotoIndexChange: (index: number) => void
  onLike: () => void
  onPass: () => void
  onBack: () => void
  /** Safe-area top inset — passed in so this component stays hook-free (unit
   *  tests invoke it directly, same pattern as HingeCard). */
  topInset: number
  busy?: boolean
}

/** Hook-free presentational body of the detail screen. Exported for unit tests. */
export function ProfileDetail({
  profile, photoIndex, onPhotoIndexChange, onLike, onPass, onBack, topInset, busy,
}: ProfileDetailProps) {
  const initial = profile.name[0]?.toUpperCase() ?? '?'
  const photos = profile.photos ?? []
  const tags = profile.tags ?? []
  const prompts = profile.prompts ?? []

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
    if (next !== photoIndex) onPhotoIndexChange(Math.max(0, Math.min(photos.length - 1, next)))
  }

  return (
    <View style={styles.container} testID="person-detail">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Photo pager ── */}
        <View style={styles.photoBlock}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleMomentumEnd}
              testID="person-photo-pager"
            >
              {photos.map((uri, i) => (
                <Image
                  key={`${i}-${uri}`}
                  source={{ uri }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.photoPlaceholder} testID="person-photo-placeholder">
              <Text style={styles.initial}>{initial}</Text>
            </View>
          )}

          {/* Page dots — only when there is something to page through */}
          {photos.length > 1 && (
            <View style={[styles.dots, { top: topInset + Spacing.sm }]} pointerEvents="none">
              {photos.map((_, i) => (
                <View
                  key={i}
                  testID={`person-dot-${i}`}
                  style={[styles.dot, i === photoIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}

          <MatchBadge score={profile.matchScore} style={[styles.matchBadge, { top: topInset + Spacing.lg }]} />

          {/* Name / age / borough over the bottom gradient */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.88)']}
            style={styles.photoGradient}
            pointerEvents="none"
          />
          <View style={styles.photoInfo} pointerEvents="none">
            <View style={styles.nameRow}>
              <Text preset="heading" style={styles.name}>{profile.name}</Text>
              <Text style={styles.age}>{profile.age}</Text>
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={Colors.textSecondary} />
              <Text style={styles.location}>{boroughLabel(profile.borough)}</Text>
            </View>
          </View>

          {/* Back chevron floated over the photo */}
          <TouchableOpacity
            testID="person-back"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={onBack}
            style={[styles.back, { top: topInset + Spacing.md }]}
          >
            <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── What you share ── */}
        {!!profile.commonground && (
          <View style={styles.section} testID="person-commonground">
            <Text style={styles.sectionLabel}>What you share</Text>
            <Text preset="heading" style={styles.commonground}>{profile.commonground}</Text>
          </View>
        )}

        {/* ── About ── */}
        {!!profile.bio && (
          <View style={styles.section} testID="person-bio">
            <Text style={styles.sectionLabel}>About me</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        )}

        {/* ── Prompts (serif answers — the Baat signature) ── */}
        {prompts.map((p) => (
          <View key={p.promptId} style={styles.section} testID={`person-prompt-${p.promptId}`}>
            <Text style={styles.sectionLabel}>{promptLabel(p.promptId)}</Text>
            <Text preset="heading" style={styles.promptAnswer}>{p.answer}</Text>
          </View>
        ))}

        {/* ── Tags ── */}
        {tags.length > 0 && (
          <View style={styles.section} testID="person-tags">
            <Text style={styles.sectionLabel}>The little things</Text>
            <View style={styles.tagWrap}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* ── Pass / Like ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          testID="person-pass"
          accessibilityRole="button"
          accessibilityLabel="Pass"
          style={styles.actionPass}
          onPress={onPass}
          activeOpacity={0.8}
          disabled={busy}
        >
          <Feather name="x" size={28} color={Colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          testID="person-like"
          accessibilityRole="button"
          accessibilityLabel="Like"
          style={styles.actionLike}
          onPress={onLike}
          activeOpacity={0.8}
          disabled={busy}
        >
          <Feather name="heart" size={26} color={Colors.onAccent} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

/** Fallback when the profile is no longer available (deep link, evicted cache). */
function ProfileUnavailable({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  return (
    <View style={styles.container} testID="person-unavailable">
      <TouchableOpacity
        testID="person-back"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={onBack}
        style={[styles.back, { top: topInset + Spacing.md }]}
      >
        <Feather name="chevron-left" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>
      <View style={styles.centered}>
        <Text style={styles.emptyGlyph}>✦</Text>
        <Text preset="heading">Profile unavailable</Text>
        <Text style={styles.emptyText}>This profile isn't in your deck anymore. Head back to keep browsing.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.emptyButtonText}>Back to Discover</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function PersonDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  // No new API call (issue #12): the tapped card stashed its profile in the
  // module cache; the live ['discover'] query data covers cache misses.
  const profile =
    getCachedProfile(userId) ??
    queryClient.getQueryData<Profile[]>(['discover'])?.find((p) => p.userId === userId)

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/(app)/discover')
  }

  async function decide(action: 'like' | 'pass') {
    if (!profile || busy) return
    setBusy(true)
    // Drop the decided profile from the feed cache so the deck doesn't
    // re-show it before the next refetch.
    queryClient.setQueryData<Profile[]>(
      ['discover'],
      (old) => old?.filter((p) => p.userId !== profile.userId),
    )
    try {
      const result = await swipe(profile.userId, action)
      if (action === 'like' && result.matched) {
        showToast({
          title: `It's ${tenant.appName}!`,
          message: `You and ${profile.name} matched — ${profile.commonground || 'say salaam in Matches'}.`,
          variant: 'success',
        })
      }
    } catch {
      // Same fire-and-forget stance as the discover feed: a failed swipe
      // resurfaces in a future deck. Don't hold the user hostage on it.
    }
    goBack()
  }

  if (!profile) return <ProfileUnavailable onBack={goBack} topInset={insets.top} />

  return (
    <ProfileDetail
      profile={profile}
      photoIndex={photoIndex}
      onPhotoIndexChange={setPhotoIndex}
      onLike={() => decide('like')}
      onPass={() => decide('pass')}
      onBack={goBack}
      topInset={insets.top}
      busy={busy}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingBottom: Spacing.lg },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.sm,
  },

  // Photo pager
  photoBlock: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    backgroundColor: Colors.surfaceHigh,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: Fonts.display,
    fontSize: 96,
    color: Colors.accent,
  },
  dots: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.overlayLight,
  },
  dotActive: {
    backgroundColor: Colors.accent,
  },
  matchBadge: {
    position: 'absolute',
    right: Spacing.md,
  },
  back: {
    position: 'absolute',
    left: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '40%',
  },
  photoInfo: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  name: {
    fontSize: 34,
    lineHeight: 40,
  },
  age: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Content sections
  section: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  commonground: {
    fontSize: FontSize.xl,
    lineHeight: 30,
  },
  bio: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  promptAnswer: {
    fontSize: 26,
    lineHeight: 33,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceHigh,
  },
  tagText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },

  // Bottom actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  actionPass: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLike: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Unavailable fallback
  emptyGlyph: { fontSize: 40, color: Colors.accent },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  emptyButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.md,
    color: Colors.accent,
  },
})
