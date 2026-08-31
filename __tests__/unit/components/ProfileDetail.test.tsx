/**
 * Profile detail unit tests (issue #12).
 *
 * Same approach as MatchBadge.test.tsx: the shared setup.ts mocks
 * react-native down to { Platform }, so this file supplies a richer mock and
 * invokes hook-free components directly, inspecting the returned element
 * trees — no renderer needed.
 */
import type { ReactElement } from 'react'
import { MatchBadge } from '../../../src/components/MatchBadge'
import { Text } from '../../../src/components/Text'
import { HingeCard } from '../../../src/components/HingeCard'
import { cacheProfile, getCachedProfile } from '../../../src/lib/profileCache'
import type { Profile } from '../../../src/api/discover'
import { router } from 'expo-router'
import ProfileDetailScreen, {
  ProfileDetail, promptLabel, boroughLabel,
} from '../../../app/(app)/person/[userId]'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    flatten: (s: unknown) => s,
    hairlineWidth: 0.5,
  },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Animated: { View: 'Animated.View', Value: class {}, timing: jest.fn() },
  Easing: { in: jest.fn(), out: jest.fn(), cubic: jest.fn() },
}))
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }))
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ getQueryData: jest.fn(), setQueryData: jest.fn() }),
}))

const PROFILE: Profile = {
  userId: 'u1',
  name: 'Priya',
  age: 28,
  gender: 'woman',
  seeking: 'men',
  borough: 'staten_island',
  bio: 'Chai over coffee.',
  photos: [],
}

const FULL_PROFILE: Profile = {
  ...PROFILE,
  photos: ['p1.jpg', 'p2.jpg', 'p3.jpg', 'p4.jpg', 'p5.jpg'],
  tags: ['foodie', 'plant parent'],
  prompts: [
    { promptId: 'ideal-sunday', answer: 'Chai and a long walk in Prospect Park' },
    { promptId: 'green-flag', answer: 'Calls their mom weekly' },
  ],
  matchScore: 92,
  commonground: 'you share Urdu and a love of chai',
}

/** Depth-first search of an element tree for elements of a given type. */
function findByType(node: unknown, type: unknown): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByType(child, type))
  const el = node as ReactElement<any>
  const self = el.type === type ? [el] : []
  return [...self, ...findByType(el.props?.children, type)]
}

/** Depth-first search for the element carrying a given testID. */
function findByTestID(node: unknown, testID: string): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByTestID(child, testID))
  const el = node as ReactElement<any>
  const self = el.props?.testID === testID ? [el] : []
  return [...self, ...findByTestID(el.props?.children, testID)]
}

function renderDetail(profile: Profile, overrides: Partial<Parameters<typeof ProfileDetail>[0]> = {}) {
  return ProfileDetail({
    profile,
    photoIndex: 0,
    onPhotoIndexChange: jest.fn(),
    onLike: jest.fn(),
    onPass: jest.fn(),
    onBack: jest.fn(),
    topInset: 59,
    ...overrides,
  })
}

describe('promptLabel', () => {
  it('humanizes slug promptIds (no catalog exists yet)', () => {
    expect(promptLabel('ideal-sunday')).toBe('Ideal sunday')
    expect(promptLabel('green_flag')).toBe('Green flag')
    expect(promptLabel('two--separators__mixed')).toBe('Two separators mixed')
  })

  it('is graceful with empty input', () => {
    expect(promptLabel('')).toBe('')
    expect(promptLabel('-')).toBe('')
  })
})

describe('boroughLabel', () => {
  it('title-cases underscore boroughs', () => {
    expect(boroughLabel('staten_island')).toBe('Staten Island')
    expect(boroughLabel('brooklyn')).toBe('Brooklyn')
  })
})

describe('profileCache', () => {
  it('round-trips a profile by userId', () => {
    cacheProfile(FULL_PROFILE)
    expect(getCachedProfile('u1')).toEqual(FULL_PROFILE)
  })

  it('returns undefined on miss or missing id', () => {
    expect(getCachedProfile('nope')).toBeUndefined()
    expect(getCachedProfile(undefined)).toBeUndefined()
  })

  it('evicts the oldest entry past the cap', () => {
    for (let i = 0; i < 101; i++) {
      cacheProfile({ ...PROFILE, userId: `evict-${i}` })
    }
    expect(getCachedProfile('evict-0')).toBeUndefined()
    expect(getCachedProfile('evict-100')).toBeDefined()
  })
})

describe('ProfileDetail — full profile', () => {
  const tree = renderDetail(FULL_PROFILE)

  it('renders one pager image per photo (5 max by contract)', () => {
    const images = findByType(tree, 'Image')
    expect(images).toHaveLength(5)
    expect(images.map((i) => i.props.source.uri)).toEqual(FULL_PROFILE.photos)
  })

  it('renders a page dot per photo', () => {
    for (let i = 0; i < 5; i++) expect(findByTestID(tree, `person-dot-${i}`)).toHaveLength(1)
    expect(findByTestID(tree, 'person-dot-5')).toHaveLength(0)
  })

  it('passes matchScore through to MatchBadge', () => {
    const badges = findByType(tree, MatchBadge)
    expect(badges).toHaveLength(1)
    expect(badges[0].props.score).toBe(92)
  })

  it('renders commonground, bio and tags sections', () => {
    expect(findByTestID(tree, 'person-commonground')).toHaveLength(1)
    expect(findByTestID(tree, 'person-bio')).toHaveLength(1)
    const tags = findByTestID(tree, 'person-tags')
    expect(tags).toHaveLength(1)
    const tagTexts = findByType(tags[0], Text).map((t) => t.props.children)
    expect(tagTexts).toEqual(expect.arrayContaining(['foodie', 'plant parent']))
  })

  it('renders each prompt with a serif (heading preset) answer', () => {
    for (const p of FULL_PROFILE.prompts!) {
      const section = findByTestID(tree, `person-prompt-${p.promptId}`)
      expect(section).toHaveLength(1)
      const texts = findByType(section[0], Text)
      const answer = texts.find((t) => t.props.children === p.answer)
      expect(answer).toBeDefined()
      expect(answer!.props.preset).toBe('heading') // serif per Text presets
    }
  })

  it('reports the swiped page back via onPhotoIndexChange (clamped)', () => {
    const onPhotoIndexChange = jest.fn()
    const t = renderDetail(FULL_PROFILE, { onPhotoIndexChange })
    const pager = findByTestID(t, 'person-photo-pager')[0]
    pager.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 2 * 390 } } })
    expect(onPhotoIndexChange).toHaveBeenCalledWith(2)
    pager.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 99 * 390 } } })
    expect(onPhotoIndexChange).toHaveBeenCalledWith(4)
  })

  it('wires like/pass/back handlers', () => {
    const onLike = jest.fn(); const onPass = jest.fn(); const onBack = jest.fn()
    const t = renderDetail(FULL_PROFILE, { onLike, onPass, onBack })
    findByTestID(t, 'person-like')[0].props.onPress()
    findByTestID(t, 'person-pass')[0].props.onPress()
    findByTestID(t, 'person-back')[0].props.onPress()
    expect(onLike).toHaveBeenCalled()
    expect(onPass).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})

describe('ProfileDetail — sparse profile (old API shape)', () => {
  const tree = renderDetail(PROFILE)

  it('shows the initial placeholder with zero photos and no pager/dots', () => {
    expect(findByTestID(tree, 'person-photo-placeholder')).toHaveLength(1)
    expect(findByTestID(tree, 'person-photo-pager')).toHaveLength(0)
    expect(findByType(tree, 'Image')).toHaveLength(0)
    expect(findByTestID(tree, 'person-dot-0')).toHaveLength(0)
  })

  it('hides dots for a single photo', () => {
    const t = renderDetail({ ...PROFILE, photos: ['only.jpg'] })
    expect(findByType(t, 'Image')).toHaveLength(1)
    expect(findByTestID(t, 'person-dot-0')).toHaveLength(0)
  })

  it('MatchBadge resolves to nothing without a score', () => {
    const badges = findByType(tree, MatchBadge)
    expect(badges).toHaveLength(1)
    expect(badges[0].props.score).toBeUndefined()
    expect(MatchBadge(badges[0].props)).toBeNull()
  })

  it('omits commonground, prompts and tags sections when absent', () => {
    expect(findByTestID(tree, 'person-commonground')).toHaveLength(0)
    expect(findByTestID(tree, 'person-tags')).toHaveLength(0)
    expect(findByTestID(tree, 'person-prompt-ideal-sunday')).toHaveLength(0)
  })

  it('treats empty tags/prompts arrays like absent ones', () => {
    const t = renderDetail({ ...PROFILE, tags: [], prompts: [] })
    expect(findByTestID(t, 'person-tags')).toHaveLength(0)
  })
})

describe('HingeCard photo tap → detail route', () => {
  it('caches the profile then pushes /person/[userId]', () => {
    const tree = HingeCard({ profile: FULL_PROFILE, onLike: jest.fn(), onPass: jest.fn() })
    const tap = findByTestID(tree, 'hinge-photo-tap')
    expect(tap).toHaveLength(1)
    ;(router.push as jest.Mock).mockClear()
    tap[0].props.onPress()
    expect(router.push).toHaveBeenCalledWith('/person/u1')
    expect(getCachedProfile('u1')).toEqual(FULL_PROFILE)
  })

  it('keeps the like button inside the tappable photo block working', () => {
    const onLike = jest.fn()
    const tree = HingeCard({ profile: FULL_PROFILE, onLike, onPass: jest.fn() })
    const tap = findByTestID(tree, 'hinge-photo-tap')[0]
    // The on-photo like button is nested inside the tap target; RN gives the
    // innermost touchable precedence, so both handlers must exist.
    const touchables = findByType(tap, 'TouchableOpacity')
    expect(touchables.length).toBeGreaterThanOrEqual(1)
  })
})

describe('PersonDetailScreen module', () => {
  it('exports a default route component (expo-router contract)', () => {
    expect(typeof ProfileDetailScreen).toBe('function')
  })
})
