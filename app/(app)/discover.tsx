import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, FlatList,
} from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { Feather } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDiscover, swipe, type Profile } from '../../src/api/discover'
import { SwipeCard } from '../../src/components/SwipeCard'
import { HingeCard } from '../../src/components/HingeCard'
import { VerificationBanner } from '../../src/components/VerificationBanner'
import { Colors, Fonts, Spacing, Radius, FontSize } from '../../src/theme'
import tenant from '../../src/config/app.config'

const PREFETCH_AHEAD = 5
const REFETCH_THRESHOLD = 3

type ViewMode = 'feed' | 'swipe'

export default function DiscoverScreen() {
  const queryClient = useQueryClient()
  const [index, setIndex] = useState(0)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [mode, setMode] = useState<ViewMode>('feed')

  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['discover'],
    queryFn: () => fetchDiscover(20),
  })

  // Warm the disk cache for the next few photos so swipes feel instant.
  useEffect(() => {
    const urls = profiles
      .slice(index, index + PREFETCH_AHEAD)
      .flatMap((p) => p.photos.slice(0, 1))
    if (urls.length > 0) ExpoImage.prefetch(urls, 'memory-disk')
  }, [profiles, index])

  // Refetch the deck early so we never hit an empty state mid-swipe.
  useEffect(() => {
    const remaining = profiles.length - index
    if (remaining > 0 && remaining <= REFETCH_THRESHOLD) {
      queryClient.invalidateQueries({ queryKey: ['discover'] })
    }
  }, [profiles, index, queryClient])

  async function handleSwipe(direction: 'like' | 'pass', targetUserId?: string) {
    const profile = targetUserId
      ? profiles.find(p => p.userId === targetUserId)
      : profiles[index]
    if (!profile) return

    if (!targetUserId) {
      const next = index + 1
      setIndex(next)
      if (next >= profiles.length) {
        setIndex(0)
        queryClient.invalidateQueries({ queryKey: ['discover'] })
      }
    }

    if (direction === 'like') {
      try {
        const result = await swipe(profile.userId, 'like')
        if (result.matched) setMatchedProfile(profile)
      } catch { }
    } else {
      swipe(profile.userId, 'pass').catch(() => { })
    }
  }

  const remaining = profiles.slice(index)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>{tenant.appName}</Text>
        <View style={styles.headerRight}>
          {/* View mode toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'feed' && styles.toggleBtnActive]}
              onPress={() => setMode('feed')}
              activeOpacity={0.7}
            >
              <Feather name="align-justify" size={16} color={mode === 'feed' ? Colors.textPrimary : Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, mode === 'swipe' && styles.toggleBtnActive]}
              onPress={() => setMode('swipe')}
              activeOpacity={0.7}
            >
              <Feather name="layers" size={16} color={mode === 'swipe' ? Colors.textPrimary : Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Feather name="sliders" size={20} color={Colors.textSecondary} />
        </View>
      </View>

      <VerificationBanner />

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : profiles.length === 0 ? (
        <EmptyState onRefresh={() => { setIndex(0); refetch() }} />
      ) : mode === 'feed' ? (
        // ── Hinge-style feed ──
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.userId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.feedContent}
          ListHeaderComponent={<View style={{ height: Spacing.sm }} />}
          ListFooterComponent={<View style={{ height: 32 }} />}
          renderItem={({ item }) => (
            <HingeCard
              profile={item}
              onLike={() => handleSwipe('like', item.userId)}
              onPass={() => handleSwipe('pass', item.userId)}
            />
          )}
        />
      ) : (
        // ── Swipe-style deck ──
        <>
          <View style={styles.deck}>
            {remaining.length === 0 ? (
              <EmptyState onRefresh={() => { setIndex(0); refetch() }} />
            ) : (
              <>
                {remaining.slice(0, 2).reverse().map((profile, i) => (
                  <View key={profile.userId} style={[styles.cardWrapper, i === 0 && styles.cardBehind]}>
                    {i === 0 && <View style={styles.cardPlaceholder} />}
                  </View>
                ))}
                {remaining[0] && (
                  <SwipeCard key={remaining[0].userId} profile={remaining[0]} onSwipe={(dir) => handleSwipe(dir)} />
                )}
              </>
            )}
          </View>

          {remaining.length > 0 && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionPass} onPress={() => handleSwipe('pass')} activeOpacity={0.8}>
                <Feather name="x" size={28} color={Colors.error} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionLike} onPress={() => handleSwipe('like')} activeOpacity={0.8}>
                <Feather name="heart" size={26} color={Colors.onAccent} />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Match celebration modal */}
      <Modal visible={!!matchedProfile} transparent animationType="fade">
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's {tenant.appName}!</Text>
          <Text style={styles.matchSub}>
            You & {matchedProfile?.name} matched — {matchedProfile?.commonground || 'you share language, faith and family values.'}
          </Text>
          <TouchableOpacity style={styles.matchButton} onPress={() => setMatchedProfile(null)} activeOpacity={0.85}>
            <Text style={styles.matchButtonText}>Send a message</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMatchedProfile(null)} activeOpacity={0.7}>
            <Text style={styles.matchSecondary}>Keep browsing</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  )
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyEmoji}>✦</Text>
      <Text style={styles.emptyTitle}>That's everyone for now</Text>
      <Text style={styles.emptySubtitle}>We introduce a curated few each day so every match gets real attention.</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    padding: 7,
    width: 36,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.accent,
  },

  // Feed mode
  feedContent: {
    paddingTop: Spacing.sm,
  },

  // Swipe mode
  deck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  cardWrapper: { position: 'absolute', width: '100%' },
  cardBehind: { transform: [{ scale: 0.94 }], top: 10 },
  cardPlaceholder: { height: '100%' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingBottom: 36,
    paddingTop: Spacing.lg,
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

  // Empty state
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm, color: Colors.accent },
  emptyTitle: { fontFamily: Fonts.display, fontSize: 26, color: Colors.textPrimary },
  emptySubtitle: { fontFamily: 'Manrope_400Regular', fontSize: FontSize.md, color: Colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.xl, lineHeight: 22 },
  refreshButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  refreshText: { fontFamily: 'Manrope_600SemiBold', fontSize: FontSize.md, color: Colors.accent },

  // Match modal
  matchOverlay: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  matchTitle: { fontFamily: Fonts.display, fontSize: 44, color: Colors.accent },
  matchSub: { fontFamily: 'Manrope_400Regular', fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  matchButton: {
    marginTop: Spacing.lg, width: '100%', borderRadius: Radius.pill,
    backgroundColor: Colors.accent, paddingVertical: Spacing.md + 2, alignItems: 'center',
  },
  matchButtonText: { fontFamily: 'Manrope_700Bold', fontSize: FontSize.md, color: Colors.onAccent },
  matchSecondary: { fontFamily: 'Manrope_600SemiBold', fontSize: FontSize.sm, color: Colors.textMuted, padding: Spacing.sm },
})
