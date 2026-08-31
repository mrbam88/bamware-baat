import type { Profile } from '../api/discover'

/**
 * Module-level handoff cache for the profile detail screen (issue #12).
 *
 * The discover feed already holds full profiles from the ['discover'] query;
 * the detail route only needs the one that was tapped. Stashing it here (keyed
 * by userId) avoids serializing a whole profile into route params AND avoids a
 * new API call. The detail screen falls back to the live ['discover'] query
 * data when the cache misses (e.g. after a fast refresh in dev).
 *
 * Unbounded growth is a non-issue: entries are small and the discover deck
 * fetches 20 at a time, but we cap it anyway to keep memory flat over a long
 * browsing session.
 */
const MAX_ENTRIES = 100

const cache = new Map<string, Profile>()

export function cacheProfile(profile: Profile): void {
  // Re-insert to refresh Map ordering so eviction stays least-recently-cached.
  cache.delete(profile.userId)
  cache.set(profile.userId, profile)
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}

export function getCachedProfile(userId: string | undefined): Profile | undefined {
  if (!userId) return undefined
  return cache.get(userId)
}
