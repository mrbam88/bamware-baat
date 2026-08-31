import { useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datingClient } from '../../src/api/client'
import { updateMyProfile, type PromptAnswer } from '../../src/api/profile'
import { MAX_PROMPT_ANSWERS } from '../../src/constants/prompts'
import { useAuthStore } from '../../src/store/authStore'
import { Colors, Spacing, Radius } from '../../src/theme'
import { Screen, Text, Card, Button, PhotoManager, TagSelector, PromptEditor } from '../../src/components'
import { useToast } from '../../src/components/ToastProvider'

async function fetchMyProfile() {
  const { data } = await datingClient.get('/profile/me')
  return data
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: fetchMyProfile,
  })

  const [tags, setTags] = useState<string[]>(profile?.tags ?? [])

  // Sync local tag state when profile loads
  useState(() => {
    if (profile?.tags) setTags(profile.tags)
  })

  const { mutate: saveTags, isPending: savingTags } = useMutation({
    mutationFn: (newTags: string[]) => datingClient.patch('/profile/me', { tags: newTags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      showToast({ variant: 'success', message: 'Tags saved!' })
    },
    onError: () => showToast({ variant: 'error', message: 'Failed to save tags.' }),
  })

  const { mutate: savePrompts, isPending: savingPrompts } = useMutation({
    mutationFn: (prompts: PromptAnswer[]) => updateMyProfile({ prompts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      showToast({ variant: 'success', message: 'Prompts saved!' })
    },
    onError: () => showToast({ variant: 'error', message: 'Failed to save prompts.' }),
  })

  const initial = user?.name?.[0]?.toUpperCase() ?? '?'
  const hasPhotos = (profile?.photos?.length ?? 0) > 0

  return (
    <Screen preset="scroll" safeAreaEdges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text preset="heading">Your profile</Text>
        <Feather name="edit-2" size={20} color={Colors.textSecondary} />
      </View>

      {/* Avatar (shown only when no photos) */}
      {!hasPhotos && (
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text preset="display" color={Colors.accent}>{initial}</Text>
            </View>
          </View>
          <Text preset="subheading">{user?.name}</Text>
          <Text testID="profile-email" preset="caption" color={Colors.textMuted}>{user?.email}</Text>
        </View>
      )}

      {/* Photo manager */}
      <View style={styles.section}>
        {hasPhotos && (
          <View style={styles.nameRow}>
            <Text preset="subheading">{user?.name}</Text>
            <Text testID="profile-email" preset="caption" color={Colors.textMuted}>{user?.email}</Text>
          </View>
        )}
        <PhotoManager
          photos={profile?.photos ?? []}
          onPhotosChange={(photos) => queryClient.setQueryData(['my-profile'], (old: any) => ({ ...old, photos }))}
        />
      </View>

      {/* ID verification nudge */}
      <View style={styles.section}>
        <Card style={styles.verifyCard} onPress={() => showToast({ variant: 'success', message: 'ID verification coming soon.' })}>
          <View style={styles.verifyRow}>
            <Text preset="body" color={Colors.accent}>✦</Text>
            <Text preset="label" style={{ flex: 1 }}>Verify your ID</Text>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </View>
        </Card>
      </View>

      {/* What you told us */}
      {profile && (
        <Card style={styles.card}>
          <View style={styles.rows}>
            <InfoRow icon="calendar" label="Age"           value={String(profile.age)} />
            <InfoRow icon="map-pin"  label="Neighbourhood" value={profile.borough?.replace('_', ' ')} />
            <InfoRow icon="user"     label="Gender"        value={profile.gender} />
            <InfoRow icon="heart"    label="Seeking"       value={profile.seeking} />
            {profile.bio && <InfoRow icon="edit-3" label="Bio" value={profile.bio} last />}
          </View>
        </Card>
      )}

      {/* Tag selector */}
      <View style={styles.section}>
        <View style={styles.tagHeader}>
          <Text preset="subheading">Your vibe</Text>
          <Text preset="caption" color={Colors.textMuted}>{tags.length}/10</Text>
        </View>
        <TagSelector
          selected={tags}
          onChange={setTags}
        />
        <Button
          preset="filled"
          text={savingTags ? 'Saving…' : 'Save tags'}
          onPress={() => saveTags(tags)}
          disabled={savingTags}
          style={styles.saveButton}
        />
      </View>

      {/* Prompts (issue #13) */}
      <View style={styles.section}>
        <View style={styles.tagHeader}>
          <Text preset="subheading">Your prompts</Text>
          <Text preset="caption" color={Colors.textMuted}>
            {`${profile?.prompts?.length ?? 0}/${MAX_PROMPT_ANSWERS}`}
          </Text>
        </View>
        <PromptEditor
          prompts={profile?.prompts}
          onSave={savePrompts}
          saving={savingPrompts}
        />
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text preset="subheading">Settings</Text>
        <Card style={styles.card2}>
          <View style={styles.rows}>
            <SettingsRow icon="shield"   label="Account & verification" testID="settings-row-account"       onPress={() => router.push('/(app)/settings/account')} />
            <SettingsRow icon="sliders"  label="Discovery preferences"  testID="settings-row-discovery"     onPress={() => router.push('/(app)/settings/discovery')} />
            <SettingsRow icon="bell"     label="Notifications"          testID="settings-row-notifications" onPress={() => router.push('/(app)/settings/notifications')} />
            <SettingsRow icon="lock"     label="Safety & privacy"       testID="settings-row-safety"        onPress={() => router.push('/(app)/settings/safety')} last />
          </View>
        </Card>
      </View>

      {/* Sign out */}
      <Button
        testID="sign-out-button"
        preset="outline"
        text="Sign out"
        onPress={logout}
        textStyle={{ color: Colors.error }}
        style={[styles.signOut, { borderColor: Colors.error + '50' }]}
        LeftAccessory={() => <Feather name="log-out" size={16} color={Colors.error} />}
      />
    </Screen>
  )
}

function SettingsRow({ icon, label, last, onPress, testID }: {
  icon: string
  label: string
  last?: boolean
  onPress?: () => void
  testID?: string
}) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}
    >
      <Feather name={icon as any} size={15} color={Colors.textMuted} />
      <Text preset="label" style={{ flex: 1 }}>{label}</Text>
      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  )
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
      <Feather name={icon as any} size={15} color={Colors.textMuted} />
      <Text preset="label" color={Colors.textMuted} style={styles.rowLabel}>{label}</Text>
      <Text preset="label" style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  avatarSection:{ alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.xl },
  avatarRing:   { width: 100, height: 100, borderRadius: 50, padding: 2.5, marginBottom: 4, backgroundColor: Colors.accent },
  verifyCard:   { paddingVertical: Spacing.sm },
  verifyRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  card2:        { marginTop: Spacing.sm },
  avatar:       { flex: 1, borderRadius: 50, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  section:      { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.md },
  nameRow:      { gap: 2 },
  card:         { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  rows:         { gap: 0 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  rowLabel:     { width: 100 },
  rowValue:     { flex: 1, textAlign: 'right', textTransform: 'capitalize', color: Colors.textPrimary },
  tagHeader:    { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  saveButton:   { marginTop: Spacing.md },
  signOut:      { marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },
})
