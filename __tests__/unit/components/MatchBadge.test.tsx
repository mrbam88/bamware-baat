/**
 * MatchBadge unit tests (issue #2).
 *
 * The shared setup.ts mocks react-native down to { Platform }, so this file
 * supplies a richer mock. Components are invoked directly (HingeCard is
 * hook-free) and the returned element trees are inspected — no renderer needed.
 */
import type { ReactElement } from 'react'
import { Colors } from '../../../src/theme'
import { MatchBadge, matchBadgeLabel } from '../../../src/components/MatchBadge'
import { HingeCard } from '../../../src/components/HingeCard'
import type { Profile } from '../../../src/api/discover'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: <T,>(styles: T) => styles, flatten: (s: unknown) => s },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}))
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }))
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }))

const PROFILE: Profile = {
  userId: 'u1',
  name: 'Priya',
  age: 28,
  gender: 'F',
  seeking: 'M',
  borough: 'brooklyn',
  bio: 'Chai over coffee.',
  photos: [],
}

/** Depth-first search of an element tree for elements of a given type. */
function findByType(node: unknown, type: unknown): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByType(child, type))
  const el = node as ReactElement<any>
  const self = el.type === type ? [el] : []
  return [...self, ...findByType(el.props?.children, type)]
}

describe('matchBadgeLabel', () => {
  it('returns null when score is absent (old API responses)', () => {
    expect(matchBadgeLabel(undefined)).toBeNull()
  })

  it('returns null for non-finite scores', () => {
    expect(matchBadgeLabel(NaN)).toBeNull()
    expect(matchBadgeLabel(Infinity)).toBeNull()
  })

  it('formats and rounds the score', () => {
    expect(matchBadgeLabel(87)).toBe('87% MATCH')
    expect(matchBadgeLabel(86.6)).toBe('87% MATCH')
    expect(matchBadgeLabel(0)).toBe('0% MATCH')
  })

  it('clamps out-of-range scores to 0–100', () => {
    expect(matchBadgeLabel(120)).toBe('100% MATCH')
    expect(matchBadgeLabel(-5)).toBe('0% MATCH')
  })
})

describe('MatchBadge', () => {
  it('renders nothing when score is absent', () => {
    expect(MatchBadge({})).toBeNull()
    expect(MatchBadge({ score: undefined })).toBeNull()
  })

  it('renders a gold badge with the formatted label', () => {
    const el = MatchBadge({ score: 87 }) as ReactElement<any>
    expect(el).not.toBeNull()
    // Container uses the accent (gold) token, never a hex literal in the component
    const [badgeStyle] = el.props.style
    expect(badgeStyle.backgroundColor).toBe(Colors.accent)
    // Label text uses dark-on-gold token
    const text = el.props.children
    expect(text.props.children).toBe('87% MATCH')
    expect(text.props.style.color).toBe(Colors.onAccent)
  })
})

describe('HingeCard with/without matchScore', () => {
  it('renders without matchScore (no crash on old API shape)', () => {
    const tree = HingeCard({ profile: PROFILE, onLike: jest.fn(), onPass: jest.fn() })
    expect(tree).toBeTruthy()
    const badges = findByType(tree, MatchBadge)
    expect(badges).toHaveLength(1)
    // MatchBadge itself resolves to null for undefined score
    expect(badges[0].props.score).toBeUndefined()
    expect(MatchBadge(badges[0].props)).toBeNull()
  })

  it('passes matchScore through to the badge when present', () => {
    const profile: Profile = { ...PROFILE, matchScore: 92, commonground: 'you share Urdu and a love of chai' }
    const tree = HingeCard({ profile, onLike: jest.fn(), onPass: jest.fn() })
    const badges = findByType(tree, MatchBadge)
    expect(badges).toHaveLength(1)
    expect(badges[0].props.score).toBe(92)
  })
})
