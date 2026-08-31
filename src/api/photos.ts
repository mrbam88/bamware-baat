// SDK 54 moved uploadAsync/FileSystemUploadType to the legacy entry point
import * as FileSystem from 'expo-file-system/legacy'
import { datingClient } from './client'

export interface UploadUrlResponse {
  photoId: string
  uploadUrl: string
  publicUrl: string
}

export function photoIdFromUrl(url: string): string {
  return url.split('/').pop()?.replace('.jpg', '') ?? ''
}

export async function requestUploadUrl(): Promise<UploadUrlResponse> {
  const { data } = await datingClient.post<UploadUrlResponse>('/profile/photos/upload-url')
  return data
}

export async function uploadToS3(uploadUrl: string, imageUri: string): Promise<void> {
  const result = await FileSystem.uploadAsync(uploadUrl, imageUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': 'image/jpeg' },
  })
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`S3 upload failed: ${result.status}`)
  }
}

export async function confirmPhotoUpload(photoId: string): Promise<unknown> {
  const { data } = await datingClient.post('/profile/photos/confirm', { photoId })
  return data
}

export async function deletePhoto(photoId: string): Promise<unknown> {
  const { data } = await datingClient.delete(`/profile/photos/${photoId}`)
  return data
}

export async function reorderPhotos(urls: string[]): Promise<unknown> {
  const { data } = await datingClient.put('/profile/photos/reorder', { urls })
  return data
}
