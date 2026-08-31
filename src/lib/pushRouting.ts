/**
 * Pure routing logic for push-notification taps (issue #14).
 *
 * Contract: new-match / new-message pushes are expected to carry `matchId` in
 * their data payload. As of 2026-07-23 the dating service does NOT send it —
 * notificationService fans out alert-only payloads ({ title, body }, no custom
 * data) — so every tap falls back to the matches list. The chat deep link
 * lights up automatically once the service adds `matchId` to the payload.
 *
 * Kept free of expo imports so the mapping is trivially unit-testable.
 */

/** Structural subset of expo-notifications' NotificationResponse. */
export interface NotificationResponseLike {
  notification: {
    request: {
      identifier?: string
      content: { data?: unknown }
      /**
       * Platform-specific remote payload. iOS puts custom APNS keys in
       * `trigger.payload`; Android puts FCM data in
       * `trigger.remoteMessage.data`.
       */
      trigger?: unknown
    }
  }
}

export const MATCHES_ROUTE = '/(app)/matches'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Merge the notification's data from every place a platform may put it.
 * Priority (last wins): Android FCM data < iOS APNS payload < content.data.
 */
export function extractNotificationData(
  response: NotificationResponseLike,
): Record<string, unknown> {
  const request = response.notification.request
  const trigger = asRecord(request.trigger)
  const androidData = asRecord(asRecord(trigger?.remoteMessage)?.data)
  const iosPayload = asRecord(trigger?.payload)
  const contentData = asRecord(request.content.data)
  return { ...androidData, ...iosPayload, ...contentData }
}

/**
 * Map a tapped notification to an expo-router route.
 *
 * - `matchId` present → matches screen with that chat opened
 * - explicit `screen` → honored as-is (legacy/general-purpose escape hatch)
 * - anything else → matches list (both current push types are match-related)
 */
export function routeForNotificationResponse(response: NotificationResponseLike): string {
  const data = extractNotificationData(response)

  const matchId = nonEmptyString(data.matchId)
  if (matchId) return `${MATCHES_ROUTE}?matchId=${encodeURIComponent(matchId)}`

  const screen = nonEmptyString(data.screen)
  if (screen) return screen

  return MATCHES_ROUTE
}

// ---------------------------------------------------------------------------
// Pending-route store: a tap is recorded here and consumed only once the user
// is authenticated and inside the (app) tabs. Module-level so the intent
// survives hook remounts (e.g. expired session → login → replay).
// ---------------------------------------------------------------------------

let pendingRoute: string | null = null
let lastHandledResponseId: string | null = null

/**
 * Record a tapped notification exactly once. Returns true when a route was
 * stashed. On cold start the same response can arrive through BOTH
 * getLastNotificationResponseAsync and the response listener; the identifier
 * guard turns the duplicate into a no-op (double-navigation protection).
 */
export function stashNotificationResponse(response: NotificationResponseLike): boolean {
  const id = nonEmptyString(response.notification.request.identifier)
  if (id !== null && id === lastHandledResponseId) return false
  if (id !== null) lastHandledResponseId = id
  pendingRoute = routeForNotificationResponse(response)
  return true
}

/** Pop the pending route (null when there is none). */
export function consumePendingRoute(): string | null {
  const route = pendingRoute
  pendingRoute = null
  return route
}

/** Test-only: clear module state between cases. */
export function resetPushRouting(): void {
  pendingRoute = null
  lastHandledResponseId = null
}
