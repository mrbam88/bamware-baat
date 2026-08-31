import {
  MATCHES_ROUTE,
  extractNotificationData,
  routeForNotificationResponse,
  stashNotificationResponse,
  consumePendingRoute,
  resetPushRouting,
  NotificationResponseLike,
} from '../../../src/lib/pushRouting'

function makeResponse(
  data: unknown,
  opts: { identifier?: string; trigger?: unknown } = {},
): NotificationResponseLike {
  return {
    notification: {
      request: {
        identifier: opts.identifier ?? 'resp-1',
        content: { data },
        trigger: opts.trigger,
      },
    },
  }
}

beforeEach(() => {
  resetPushRouting()
})

describe('routeForNotificationResponse', () => {
  it('routes to the specific chat when data carries matchId', () => {
    const route = routeForNotificationResponse(makeResponse({ matchId: 'm-123' }))
    expect(route).toBe('/(app)/matches?matchId=m-123')
  })

  it('URL-encodes the matchId', () => {
    const route = routeForNotificationResponse(makeResponse({ matchId: 'a b&c' }))
    expect(route).toBe('/(app)/matches?matchId=a%20b%26c')
  })

  it('falls back to the matches list when there is no data (current service payload)', () => {
    // notificationService sends alert-only pushes today — no data at all.
    expect(routeForNotificationResponse(makeResponse(undefined))).toBe(MATCHES_ROUTE)
    expect(routeForNotificationResponse(makeResponse({}))).toBe(MATCHES_ROUTE)
  })

  it('ignores a non-string or empty matchId', () => {
    expect(routeForNotificationResponse(makeResponse({ matchId: 42 }))).toBe(MATCHES_ROUTE)
    expect(routeForNotificationResponse(makeResponse({ matchId: '' }))).toBe(MATCHES_ROUTE)
    expect(routeForNotificationResponse(makeResponse({ matchId: { nested: true } }))).toBe(MATCHES_ROUTE)
  })

  it('honors an explicit screen when no matchId is present', () => {
    const route = routeForNotificationResponse(makeResponse({ screen: '/(app)/discover' }))
    expect(route).toBe('/(app)/discover')
  })

  it('prefers matchId over screen', () => {
    const route = routeForNotificationResponse(
      makeResponse({ matchId: 'm-1', screen: '/(app)/discover' }),
    )
    expect(route).toBe('/(app)/matches?matchId=m-1')
  })

  it('reads matchId from the iOS APNS trigger payload', () => {
    const route = routeForNotificationResponse(
      makeResponse(undefined, {
        trigger: { type: 'push', payload: { aps: { alert: {} }, matchId: 'm-ios' } },
      }),
    )
    expect(route).toBe('/(app)/matches?matchId=m-ios')
  })

  it('reads matchId from the Android FCM remoteMessage data', () => {
    const route = routeForNotificationResponse(
      makeResponse(undefined, {
        trigger: { type: 'push', remoteMessage: { data: { matchId: 'm-android' } } },
      }),
    )
    expect(route).toBe('/(app)/matches?matchId=m-android')
  })

  it('prefers content.data over platform trigger payloads', () => {
    const route = routeForNotificationResponse(
      makeResponse(
        { matchId: 'm-content' },
        { trigger: { payload: { matchId: 'm-ios' }, remoteMessage: { data: { matchId: 'm-android' } } } },
      ),
    )
    expect(route).toBe('/(app)/matches?matchId=m-content')
  })
})

describe('extractNotificationData', () => {
  it('tolerates malformed trigger shapes', () => {
    expect(extractNotificationData(makeResponse(undefined, { trigger: 'weird' }))).toEqual({})
    expect(extractNotificationData(makeResponse(undefined, { trigger: [1, 2] }))).toEqual({})
    expect(extractNotificationData(makeResponse(null, { trigger: null }))).toEqual({})
  })
})

describe('stash / consume pending route', () => {
  it('stashes a tap and consumes it exactly once', () => {
    expect(stashNotificationResponse(makeResponse({ matchId: 'm-1' }))).toBe(true)
    expect(consumePendingRoute()).toBe('/(app)/matches?matchId=m-1')
    expect(consumePendingRoute()).toBeNull()
  })

  it('dedupes the same response delivered twice (cold-start double delivery)', () => {
    const response = makeResponse({ matchId: 'm-1' }, { identifier: 'same-id' })
    expect(stashNotificationResponse(response)).toBe(true)
    expect(consumePendingRoute()).toBe('/(app)/matches?matchId=m-1')
    // Same response arrives again via the listener — must NOT re-stash.
    expect(stashNotificationResponse(response)).toBe(false)
    expect(consumePendingRoute()).toBeNull()
  })

  it('accepts a new response after a previous one was consumed', () => {
    stashNotificationResponse(makeResponse({ matchId: 'm-1' }, { identifier: 'id-1' }))
    consumePendingRoute()
    expect(stashNotificationResponse(makeResponse({ matchId: 'm-2' }, { identifier: 'id-2' }))).toBe(true)
    expect(consumePendingRoute()).toBe('/(app)/matches?matchId=m-2')
  })

  it('a newer tap overwrites an unconsumed pending route', () => {
    stashNotificationResponse(makeResponse({ matchId: 'm-old' }, { identifier: 'id-1' }))
    stashNotificationResponse(makeResponse({ matchId: 'm-new' }, { identifier: 'id-2' }))
    expect(consumePendingRoute()).toBe('/(app)/matches?matchId=m-new')
    expect(consumePendingRoute()).toBeNull()
  })

  it('stashes responses without an identifier (no dedupe possible)', () => {
    const response = makeResponse({ matchId: 'm-1' }, { identifier: undefined })
    expect(stashNotificationResponse(response)).toBe(true)
    expect(consumePendingRoute()).toBe('/(app)/matches?matchId=m-1')
  })
})
