import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal, Pressable,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMatches, fetchMessages, sendMessage, MatchPage } from '../../src/api/matches'
import { block, report, ReportReason, REPORT_REASONS } from '../../src/api/safety'
import { useToast } from '../../src/components/ToastProvider'
import { useAuthStore } from '../../src/store/authStore'
import { Colors, Fonts, Spacing, Radius, FontSize } from '../../src/theme'

/** Baat signature glyph. */
const GLYPH = '✦'

/** Hardcoded for now — server-generated icebreakers are out of scope (issue #4). */
const ICEBREAKERS = [
  'Two truths and a lie — go.',
  "What's the best thing you ate this week?",
  'Coffee walk or cocktail bar for a first meet?',
  "What's a small thing that made you smile today?",
  "Settle it: is a hot dog a sandwich?",
]

/** Stable per-chat pick so the suggestion doesn't change between renders. */
function pickIcebreaker(matchId: string): string {
  let hash = 0
  for (let i = 0; i < matchId.length; i++) hash = (hash * 31 + matchId.charCodeAt(i)) >>> 0
  return ICEBREAKERS[hash % ICEBREAKERS.length]
}

interface SelectedMatch {
  matchId: string
  matchedUserId: string
  name: string
  commonground?: string
}

export default function MatchesScreen() {
  const [selected, setSelected] = useState<SelectedMatch | null>(null)
  const queryClient = useQueryClient()

  // Push deep link (issue #14): /(app)/matches?matchId=… opens that chat once
  // the matches list has loaded. Same query key as MatchList → shared cache.
  const params = useLocalSearchParams<{ matchId?: string }>()
  const deepLinkMatchId = typeof params.matchId === 'string' && params.matchId ? params.matchId : null
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ['matches'],
    queryFn: () => fetchMatches(),
  })
  // Tracks a one-shot refetch per deep-linked matchId, for when the push
  // arrives before the cached list knows about the (new) match.
  const refetchedForRef = useRef<string | null>(null)

  useEffect(() => {
    if (!deepLinkMatchId || !data) return

    const match = data.matches.find((m) => m.matchId === deepLinkMatchId)
    if (match) {
      // Consume the param ('' → falsy → ignored) so backing out of the chat
      // shows the list instead of re-triggering the deep link.
      router.setParams({ matchId: '' })
      setSelected({
        matchId: match.matchId,
        matchedUserId: match.matchedUserId,
        name: match.matchedName ?? 'Someone new',
        commonground: match.commonground,
      })
      return
    }

    if (refetchedForRef.current !== deepLinkMatchId) {
      // Not in the cached list yet (fresh match) — refetch once and retry.
      refetchedForRef.current = deepLinkMatchId
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      return
    }

    // Still unknown after a refetch (stale push, unmatched) — stay on the list.
    router.setParams({ matchId: '' })
  }, [deepLinkMatchId, data, dataUpdatedAt, queryClient])

  if (selected) {
    return (
      <ChatView
        matchId={selected.matchId}
        matchedUserId={selected.matchedUserId}
        name={selected.name}
        commonground={selected.commonground}
        onBack={() => setSelected(null)}
      />
    )
  }

  return <MatchList onSelect={setSelected} />
}

function MatchList({ onSelect }: { onSelect: (match: SelectedMatch) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => fetchMatches(),
  })
  const matches = data?.matches ?? []

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your matches</Text>
          <Text style={styles.headerSub}>Start with a hello — we picked an icebreaker.</Text>
        </View>
        <Text style={styles.headerCount}>{matches.length > 0 ? `${matches.length}` : ''}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : matches.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="heart" size={40} color={Colors.border} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>Keep exploring — someone's out there</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.matchId}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const name = item.matchedName ?? 'Someone new'
            const initial = name[0]?.toUpperCase() ?? '?'
            return (
              <TouchableOpacity
                style={styles.matchRow}
                onPress={() => onSelect({ matchId: item.matchId, matchedUserId: item.matchedUserId, name, commonground: item.commonground })}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchName}>{name}</Text>
                  {item.commonground ? (
                    <Text style={styles.matchPreview} numberOfLines={1}>
                      <Text style={styles.matchPreviewGlyph}>{GLYPH}</Text> {item.commonground}
                    </Text>
                  ) : (
                    <Text style={styles.matchDate}>
                      Matched {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

/**
 * Icebreaker banner (issue #4). Renders nothing when `commonground` is absent —
 * the thread lays out exactly as before, no reserved space.
 */
function IcebreakerBanner({ commonground }: { commonground?: string }) {
  if (!commonground) return null
  return (
    <View style={styles.icebreakerBanner}>
      <Text style={styles.icebreakerGlyph}>{GLYPH}</Text>
      <Text style={styles.icebreakerText}>
        <Text style={styles.icebreakerHighlight}>{commonground}</Text> — break the ice
      </Text>
    </View>
  )
}

/** Human labels for the service's report-reason enum. */
const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  fake_profile: 'Fake profile',
  harassment: 'Harassment',
  inappropriate_photos: 'Inappropriate photos',
  other: 'Other',
}

function ChatView({ matchId, matchedUserId, name, commonground, onBack }: {
  matchId: string
  matchedUserId: string
  name: string
  commonground?: string
  onBack: () => void
}) {
  const [text, setText] = useState('')
  const [safetyMenu, setSafetyMenu] = useState<'closed' | 'actions' | 'report'>('closed')
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['messages', matchId],
    queryFn: () => fetchMessages(matchId),
    refetchInterval: 5000,
  })

  const { mutate: send, isPending } = useMutation({
    mutationFn: (content: string) => sendMessage(matchId, content),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['messages', matchId] })
    },
  })

  /** Drop this match from the cached list so it disappears without waiting on the refetch. */
  const removeMatchFromCache = () => {
    queryClient.setQueryData<MatchPage>(['matches'], (old) =>
      old ? { ...old, matches: old.matches.filter((m) => m.matchId !== matchId) } : old,
    )
  }

  const afterSafetyAction = () => {
    removeMatchFromCache()
    queryClient.invalidateQueries({ queryKey: ['matches'] })
    queryClient.invalidateQueries({ queryKey: ['discover'] })
    onBack()
  }

  const { mutate: blockUser, isPending: blocking } = useMutation({
    mutationFn: () => block(matchedUserId),
    onSuccess: () => {
      setSafetyMenu('closed')
      showToast({ variant: 'success', message: `${name} has been blocked.` })
      afterSafetyAction()
    },
    onError: () => showToast({ variant: 'error', message: 'Could not block. Try again.' }),
  })

  const { mutate: reportUser, isPending: reporting } = useMutation({
    mutationFn: (reason: ReportReason) => report(matchedUserId, reason),
    onSuccess: () => {
      setSafetyMenu('closed')
      showToast({ variant: 'success', message: 'Report received. Thank you for keeping Baat safe.' })
      afterSafetyAction()
    },
    onError: () => showToast({ variant: 'error', message: 'Could not send report. Try again.' }),
  })

  const safetyBusy = blocking || reporting

  const confirmBlock = () => {
    Alert.alert(
      `Block ${name}?`,
      "They won't appear in your matches or discover, and neither of you can message the other.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => blockUser() },
      ],
    )
  }

  const messages = data?.messages ?? []

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Chat header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="chevron-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatAvatarSmall}>
          <Text style={styles.chatAvatarText}>{name[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.chatName}>{name}</Text>
        <TouchableOpacity
          testID="chat-overflow-button"
          accessibilityRole="button"
          accessibilityLabel="More options"
          onPress={() => setSafetyMenu('actions')}
          style={styles.overflowButton}
          activeOpacity={0.7}
        >
          <Feather name="more-horizontal" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Block / Report menu */}
      <Modal
        visible={safetyMenu !== 'closed'}
        transparent
        animationType="fade"
        onRequestClose={() => !safetyBusy && setSafetyMenu('closed')}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => !safetyBusy && setSafetyMenu('closed')}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {safetyMenu === 'actions' ? (
              <>
                <Text style={styles.sheetTitle}>{name}</Text>
                <TouchableOpacity
                  testID="safety-block"
                  style={styles.sheetRow}
                  onPress={confirmBlock}
                  disabled={safetyBusy}
                  activeOpacity={0.7}
                >
                  <Feather name="slash" size={18} color={Colors.error} />
                  <Text style={[styles.sheetRowText, styles.sheetRowTextDanger]}>
                    {blocking ? 'Blocking…' : 'Block'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="safety-report"
                  style={styles.sheetRow}
                  onPress={() => setSafetyMenu('report')}
                  disabled={safetyBusy}
                  activeOpacity={0.7}
                >
                  <Feather name="flag" size={18} color={Colors.textPrimary} />
                  <Text style={styles.sheetRowText}>Report</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Why are you reporting {name}?</Text>
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    testID={`report-reason-${reason}`}
                    style={styles.sheetRow}
                    onPress={() => reportUser(reason)}
                    disabled={safetyBusy}
                    activeOpacity={0.7}
                  >
                    <Feather name="flag" size={18} color={Colors.textMuted} />
                    <Text style={styles.sheetRowText}>
                      {reporting ? 'Sending…' : REPORT_REASON_LABELS[reason]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
            <TouchableOpacity
              testID="safety-cancel"
              style={styles.sheetCancel}
              onPress={() => setSafetyMenu('closed')}
              disabled={safetyBusy}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <IcebreakerBanner commonground={commonground} />

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.accent} /></View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.icebreakerSuggestLabel}>Not sure how to start?</Text>
          <Text style={styles.icebreakerSuggestLine}>"{pickIcebreaker(matchId)}"</Text>
        </View>
      ) : (
        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(m) => m.messageId}
          inverted
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.userId
            return (
              <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.bubbleText, isMine && styles.myBubbleText]}>{item.content}</Text>
              </View>
            )
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="Message..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || isPending) && styles.sendButtonDisabled]}
          onPress={() => text.trim() && send(text.trim())}
          disabled={!text.trim() || isPending}
          activeOpacity={0.8}
        >
          <Feather name="send" size={18} color={Colors.onAccent} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: FontSize.xxl, color: Colors.textPrimary },
  headerSub: { fontFamily: 'Manrope_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  headerCount: { fontFamily: 'Manrope_600SemiBold', fontSize: FontSize.sm, color: Colors.accent },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 70 },
  emptyTitle: { fontFamily: 'Manrope_600SemiBold', fontSize: FontSize.lg, color: Colors.textSecondary, marginBottom: 6 },
  emptySubtitle: { fontFamily: 'Manrope_400Regular', fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center' },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '40',
  },
  avatarText: { fontFamily: 'Manrope_700Bold', fontSize: FontSize.lg, color: Colors.accent },
  matchInfo: { flex: 1 },
  matchName: { fontFamily: 'Manrope_600SemiBold', fontSize: FontSize.md, color: Colors.textPrimary },
  matchDate: { fontFamily: 'Manrope_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3 },
  matchPreview: { fontFamily: Fonts.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3 },
  matchPreviewGlyph: { color: Colors.accent },
  icebreakerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  icebreakerGlyph: { fontFamily: Fonts.semibold, fontSize: FontSize.md, color: Colors.accent },
  icebreakerText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  icebreakerHighlight: { fontFamily: Fonts.semibold, color: Colors.accent },
  icebreakerSuggestLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  icebreakerSuggestLine: {
    fontFamily: Fonts.displayItalic,
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backButton: { padding: 4 },
  overflowButton: { padding: 4 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  sheetTitle: {
    fontFamily: Fonts.semibold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetRowText: { fontFamily: Fonts.medium, fontSize: FontSize.md, color: Colors.textPrimary },
  sheetRowTextDanger: { color: Colors.error },
  sheetCancel: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
  sheetCancelText: { fontFamily: Fonts.semibold, fontSize: FontSize.md, color: Colors.textSecondary },
  chatAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarText: { fontFamily: 'Manrope_700Bold', fontSize: FontSize.md, color: Colors.accent },
  chatName: { fontFamily: 'Manrope_700Bold', fontSize: FontSize.md, color: Colors.textPrimary, flex: 1 },
  bubble: {
    maxWidth: '78%',
    marginVertical: 3,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: { alignSelf: 'flex-end', backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: 'Manrope_400Regular', fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  myBubbleText: { color: Colors.onAccent },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    fontFamily: 'Manrope_400Regular',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
})
