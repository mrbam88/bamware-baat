import { useState } from 'react'
import {
  View, Pressable, ActivityIndicator,
  Alert, StyleSheet, Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { requestUploadUrl, uploadToS3, confirmPhotoUpload, deletePhoto, photoIdFromUrl } from '../api/photos'
import { useToast } from './ToastProvider'
import { Colors, Radius, Spacing } from '../theme'
import { Text } from './Text'

const SCREEN_WIDTH = Dimensions.get('window').width
const SLOT_GAP = Spacing.sm
const H_PADDING = Spacing.lg * 2
const LARGE_SLOT = (SCREEN_WIDTH - H_PADDING - SLOT_GAP) / 2
const SMALL_SLOT = (SCREEN_WIDTH - H_PADDING - SLOT_GAP * 2) / 3
const MAX_PHOTOS = 5

interface Props {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
}

export function PhotoManager({ photos, onPhotosChange }: Props) {
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  async function pickAndUpload(slotIndex: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      showToast({ variant: 'error', message: 'Photo library access is required to add a photo.' })
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    })

    if (result.canceled || !result.assets[0]) return

    const imageUri = result.assets[0].uri
    setUploading((prev) => ({ ...prev, [slotIndex]: true }))

    try {
      const { photoId, uploadUrl } = await requestUploadUrl()
      await uploadToS3(uploadUrl, imageUri)
      const updated = await confirmPhotoUpload(photoId) as { photos: string[] }
      onPhotosChange(updated.photos)
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
    } catch (err) {
      showToast({ variant: 'error', message: 'Upload failed. Please try again.' })
    } finally {
      setUploading((prev) => ({ ...prev, [slotIndex]: false }))
    }
  }

  function promptDelete(url: string) {
    Alert.alert('Remove photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const photoId = photoIdFromUrl(url)
            const updated = await deletePhoto(photoId) as { photos: string[] }
            onPhotosChange(updated.photos)
            queryClient.invalidateQueries({ queryKey: ['my-profile'] })
          } catch {
            showToast({ variant: 'error', message: 'Could not remove photo.' })
          }
        },
      },
    ])
  }

  // Build 5 slots: [0,1] large top row, [2,3,4] small bottom row
  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => ({
    index: i,
    url: photos[i] ?? null,
    isLarge: i < 2,
    size: i < 2 ? LARGE_SLOT : SMALL_SLOT,
  }))

  return (
    <View style={styles.container}>
      {/* Large slots — top row */}
      <View style={styles.row}>
        {slots.slice(0, 2).map((slot) => (
          <Slot
            key={slot.index}
            url={slot.url}
            size={slot.size}
            isUploading={!!uploading[slot.index]}
            onAdd={() => pickAndUpload(slot.index)}
            onDelete={() => slot.url && promptDelete(slot.url)}
          />
        ))}
      </View>

      {/* Small slots — bottom row */}
      <View style={styles.row}>
        {slots.slice(2).map((slot) => (
          <Slot
            key={slot.index}
            url={slot.url}
            size={slot.size}
            isUploading={!!uploading[slot.index]}
            onAdd={() => pickAndUpload(slot.index)}
            onDelete={() => slot.url && promptDelete(slot.url)}
          />
        ))}
      </View>
    </View>
  )
}

interface SlotProps {
  url: string | null
  size: number
  isUploading: boolean
  onAdd: () => void
  onDelete: () => void
}

function Slot({ url, size, isUploading, onAdd, onDelete }: SlotProps) {
  return (
    <Pressable
      style={[styles.slot, { width: size, height: size * 1.25 }]}
      onPress={url ? onDelete : onAdd}
      onLongPress={url ? onDelete : undefined}
    >
      {url ? (
        <>
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          <View style={styles.deleteOverlay}>
            <Feather name="x" size={14} color={Colors.textPrimary} />
          </View>
        </>
      ) : (
        <View style={styles.emptySlot}>
          {isUploading
            ? <ActivityIndicator color={Colors.accent} />
            : <Feather name="plus" size={24} color={Colors.textMuted} />
          }
        </View>
      )}
      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator color={Colors.accent} />
          <Text preset="caption" color={Colors.textSecondary} style={{ marginTop: 4 }}>Uploading…</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { gap: SLOT_GAP },
  row:        { flexDirection: 'row', gap: SLOT_GAP },
  slot: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
