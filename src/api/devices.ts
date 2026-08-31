import { Platform } from 'react-native'
import { datingClient } from './client'

export async function registerDevice(deviceId: string, token: string): Promise<void> {
  await datingClient.post('/devices', {
    deviceId,
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  })
}

export async function unregisterDevice(deviceId: string): Promise<void> {
  await datingClient.delete(`/devices/${deviceId}`)
}
