import { Stack } from 'expo-router'

/**
 * Profile detail stack — nested inside the (app) Tabs navigator (declared
 * there with `href: null`, same pattern as settings/) so the tab bar stays
 * visible while viewing someone's full profile. The screen hand-rolls its
 * own back chevron over the photo pager.
 */
export default function PersonLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
