import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
// `router` singleton (not useRouter) keeps HingeCard hook-free — unit tests
// invoke it as a plain function (see __tests__/unit/components/MatchBadge.test.tsx).
import { router } from 'expo-router'
import type { Profile, PromptAnswer } from '../api/discover'
import { promptLabel } from '../constants/prompts'
import { cacheProfile } from '../lib/profileCache'
import { MatchBadge } from './MatchBadge'
import { Colors, Fonts, Spacing, Radius, FontSize } from '../theme'

const SCREEN_WIDTH = Dimensions.get('window').width
const PHOTO_HEIGHT = SCREEN_WIDTH * 1.1

interface Props {
  profile: Profile
  onLike: () => void
  onPass: () => void
}

/** Photo tap → full profile detail (issue #12). Cache-then-navigate: the
 *  detail route reads the tapped profile back out of the module cache, so no
 *  extra API call is made. */
export function openProfileDetail(profile: Profile) {
  cacheProfile(profile)
  router.push(`/person/${profile.userId}`)
}

/** One answered prompt, Hinge-style: label + serif answer + inline like (issue #13). */
function HingePromptBlock({ prompt, onLike }: { prompt: PromptAnswer; onLike: () => void }) {
  return (
    <View style={styles.promptBlock} testID={`hinge-prompt-${prompt.promptId}`}>
      <Text style={styles.promptLabel}>{promptLabel(prompt.promptId)}</Text>
      <Text style={styles.promptAnswer}>{prompt.answer}</Text>
      <TouchableOpacity
        style={styles.likeOnPrompt}
        onPress={onLike}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Like this answer"
      >
        <Feather name="heart" size={16} color={Colors.accent} />
      </TouchableOpacity>
    </View>
  )
}

export function HingeCard({ profile, onLike, onPass }: Props) {
  const initial = profile.name[0]?.toUpperCase() ?? '?'
  // Interleaved Hinge-style: first prompt right after the photo, the rest
  // after the bio. Rendered ONLY when answers exist — nothing is reserved for
  // them, so cards without prompts keep the exact pre-#13 layout (zero shift).
  const prompts = profile.prompts ?? []

  return (
    <View style={styles.card}>
      {/* ── Main photo block: tap anywhere on the photo for the detail view ── */}
      <TouchableOpacity
        style={styles.photoBlock}
        onPress={() => openProfileDetail(profile)}
        activeOpacity={0.92}
        testID="hinge-photo-tap"
        accessibilityRole="button"
        accessibilityLabel={`View ${profile.name}'s full profile`}
      >
        {profile.photos.length > 0 ? (
          <Image
            source={{ uri: profile.photos[0] }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.initial}>{initial}</Text>
          </View>
        )}

        {/* Match % badge pinned top-left over the photo */}
        <MatchBadge score={profile.matchScore} style={styles.matchBadge} />

        {/* Name / age / location overlaid at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.88)']}
          style={styles.photoGradient}
        />
        <View style={styles.photoInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.age}>{profile.age}</Text>
          </View>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={Colors.textSecondary} />
            <Text style={styles.location}>{profile.borough.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Like button on photo */}
        <TouchableOpacity style={styles.likeOnPhoto} onPress={onLike} activeOpacity={0.85}>
          <Feather name="heart" size={20} color={Colors.onAccent} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* ── First prompt answer, interleaved right after the photo ── */}
      {prompts.length > 0 && <HingePromptBlock prompt={prompts[0]} onLike={onLike} />}

      {/* ── Bio prompt block (if bio exists) ── */}
      {!!profile.bio && (
        <View style={styles.promptBlock} testID="hinge-bio">
          <Text style={styles.promptLabel}>About me</Text>
          <Text style={styles.promptText}>{profile.bio}</Text>
          <TouchableOpacity style={styles.likeOnPrompt} onPress={onLike} activeOpacity={0.85}>
            <Feather name="heart" size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Remaining prompt answers after the bio ── */}
      {prompts.slice(1).map((p) => (
        <HingePromptBlock key={p.promptId} prompt={p} onLike={onLike} />
      ))}

      {/* ── Pass / Like action row ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.passButton} onPress={onPass} activeOpacity={0.8}>
          <Feather name="x" size={22} color={Colors.textMuted} />
          <Text style={styles.passText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLike} activeOpacity={0.85} style={styles.likeButton}>
          <Feather name="heart" size={20} color={Colors.onAccent} />
          <Text style={styles.likeText}>Like</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Photo block
  photoBlock: {
    width: '100%',
    height: PHOTO_HEIGHT,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: Fonts.display,
    fontSize: 96,
    color: Colors.accent,
  },
  matchBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '45%',
  },
  photoInfo: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: 64,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.textPrimary,
  },
  age: {
    fontFamily: 'Manrope_400Regular',
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontFamily: 'Manrope_400Regular',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  likeOnPhoto: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },

  // Prompt block
  promptBlock: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  promptLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: FontSize.xs,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  promptText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  /** Serif answers — the Baat signature (matches ProfileDetail's promptAnswer). */
  promptAnswer: {
    fontFamily: Fonts.display,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  likeOnPrompt: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.accent + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action row
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  passButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  passText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
  likeText: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.sm,
    color: Colors.onAccent,
  },
})
