import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { v4 as uuidv4 } from 'uuid'
import * as storage from './storage'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
})

const DEVICE_ID_KEY = 'push_device_id'

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await storage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const id = uuidv4()
  await storage.setItem(DEVICE_ID_KEY, id)
  return id
}

export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) return false

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#9B6BFF',
    })
  }

  const existing = await Notifications.getPermissionsAsync() as unknown as { granted: boolean }
  if (existing.granted) return true

  const result = await Notifications.requestPermissionsAsync() as unknown as { granted: boolean }
  return result.granted
}

export async function getNativeDeviceToken(): Promise<string | null> {
  try {
    const { data } = await Notifications.getDevicePushTokenAsync()
    return data
  } catch {
    return null
  }
}

let _logoutCallback: (() => Promise<void>) | null = null

export function setLogoutCallback(fn: (() => Promise<void>) | null) {
  _logoutCallback = fn
}

export async function runLogoutCallback(): Promise<void> {
  try {
    await _logoutCallback?.()
  } catch {
    // best-effort
  }
}
