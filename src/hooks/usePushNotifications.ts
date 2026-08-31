import { useEffect, useRef, useState } from 'react'
import * as Notifications from 'expo-notifications'
import type { Subscription } from 'expo-notifications'
import { useRouter, useSegments } from 'expo-router'
import {
  requestPushPermission,
  getNativeDeviceToken,
  getOrCreateDeviceId,
  setLogoutCallback,
} from '../lib/notifications'
import { stashNotificationResponse, consumePendingRoute } from '../lib/pushRouting'
import { registerDevice, unregisterDevice } from '../api/devices'
import { logger } from '../lib/logger'

export function usePushNotifications(userId: string | null) {
  const router = useRouter()
  const segments = useSegments()
  const deviceIdRef = useRef<string | null>(null)
  // Bumped whenever a tap is stashed so the navigation effect re-runs even
  // when userId/segments haven't changed (warm-start tap inside the app).
  const [responseTick, setResponseTick] = useState(0)

  const inApp = segments[0] === '(app)'

  // Device registration — only while authenticated.
  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function register() {
      const granted = await requestPushPermission()
      if (!granted || cancelled) return

      const token = await getNativeDeviceToken()
      if (!token || cancelled) return

      const deviceId = await getOrCreateDeviceId()
      if (cancelled) return

      deviceIdRef.current = deviceId

      try {
        await registerDevice(deviceId, token)
        setLogoutCallback(async () => {
          await unregisterDevice(deviceId)
          setLogoutCallback(null)
        })
      } catch (err) {
        logger.warn?.('push_register_failed', { error: err instanceof Error ? err.message : 'unknown' })
      }
    }

    register()

    return () => {
      cancelled = true
    }
  }, [userId])

  // Tap handling (issue #14) — subscribed for the app's whole lifetime, even
  // logged out, so a tap during an expired session stashes the intent and
  // replays after the user signs back in.
  useEffect(() => {
    // Cold start: the response that launched the app isn't always delivered
    // to the listener — pull it explicitly. stashNotificationResponse dedupes
    // by response id, so platforms that deliver it both ways don't navigate
    // twice.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response && stashNotificationResponse(response)) {
          setResponseTick((t) => t + 1)
        }
      })
      .catch(() => {
        // No cold-start response — nothing to do.
      })

    const responseSub: Subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (stashNotificationResponse(response)) {
        setResponseTick((t) => t + 1)
      }
    })

    const foregroundSub: Subscription = Notifications.addNotificationReceivedListener((notification) => {
      logger.info?.('push_received_foreground', {
        title: notification.request.content.title,
      })
    })

    return () => {
      responseSub.remove()
      foregroundSub.remove()
    }
  }, [])

  // Navigate only once the session is hydrated AND AuthGate has landed inside
  // the (app) tabs — pushing earlier races AuthGate's replace() and would be
  // clobbered (or crash into a logged-out stack). If the user is logged out,
  // the pending route simply waits here until after login.
  useEffect(() => {
    if (!userId || !inApp) return
    const route = consumePendingRoute()
    if (route) router.push(route as never)
  }, [userId, inApp, responseTick])

  async function deregister() {
    if (!deviceIdRef.current) return
    try {
      await unregisterDevice(deviceIdRef.current)
    } catch {
      // best-effort on logout
    }
    deviceIdRef.current = null
  }

  return { deregister }
}
