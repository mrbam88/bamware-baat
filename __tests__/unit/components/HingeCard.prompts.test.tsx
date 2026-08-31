/**
 * HingeCard prompt rendering (issue #13).
 *
 * Acceptance criterion under test: answered prompts render Hinge-style,
 * interleaved between the photo and bio sections, and cards WITHOUT prompts
 * render the exact same tree as before — zero layout shift.
 */
import type { ReactElement } from 'react'
import { HingeCard } from '../../../src/components/HingeCard'
import type { Profile } from '../../../src/api/discover'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    flatten: (s: unknown) => s,
    hairlineWidth: 0.5,
  },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}))
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }))
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }))

const BASE: Profile = {
  userId: 'u1',
  name: 'Priya',
  age: 28,
  gender: 'woman',
  seeking: 'men',
  borough: 'brooklyn',
  bio: 'Chai over coffee.',
  photos: ['p1.jpg'],
}

const WITH_PROMPTS: Profile = {
  ...BASE,
  prompts: [
    { promptId: 'dish-tastes-like-home', answer: 'Nihari on a cold Sunday' },
    { promptId: 'fluent-in', answer: 'Punjabi, sarcasm, and silence' },
    { promptId: 'family-will-ask-about', answer: 'Why I moved to Bushwick' },
  ],
}

function render(profile: Profile, onLike = jest.fn(), onPass = jest.fn()) {
  return HingeCard({ profile, onLike, onPass })
}

/** Depth-first search for the element carrying a given testID. */
function findByTestID(node: unknown, testID: string): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByTestID(child, testID))
  const el = node as ReactElement<any>
  const self = el.props?.testID === testID ? [el] : []
  return [...self, ...findByTestID(el.props?.children, testID)]
}

/** All testIDs in depth-first (≈ visual top-to-bottom) order. */
function collectTestIDs(node: unknown): string[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(collectTestIDs)
  const el = node as ReactElement<any>
  const self = el.props?.testID ? [el.props.testID] : []
  return [...self, ...collectTestIDs(el.props?.children)]
}

/** Collect every string rendered anywhere below the node. */
function collectStrings(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(collectStrings)
  return collectStrings((node as ReactElement<any>).props?.children)
}

// HingeCard prompt blocks resolve their subtree through the component
// function; flatten them for tree-wide searches.
function expand(node: unknown): unknown {
  if (node == null || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(expand)
  const el = node as ReactElement<any>
  if (typeof el.type === 'function') {
    return expand((el.type as (p: unknown) => unknown)(el.props))
  }
  const children = expand(el.props?.children)
  return { ...el, props: { ...el.props, children } }
}

describe('HingeCard with prompt answers', () => {
  it('renders one block per answered prompt with the catalog label + answer', () => {
    const tree = expand(render(WITH_PROMPTS))
    for (const p of WITH_PROMPTS.prompts!) {
      const block = findByTestID(tree, `hinge-prompt-${p.promptId}`)
      expect(block).toHaveLength(1)
      expect(collectStrings(block[0])).toContain(p.answer)
    }
    const first = findByTestID(tree, 'hinge-prompt-dish-tastes-like-home')[0]
    expect(collectStrings(first)).toContain('The dish that tastes like home…')
  })

  it('interleaves Hinge-style: first prompt after the photo, the rest after the bio', () => {
    const ids = collectTestIDs(expand(render(WITH_PROMPTS)))
    const order = [
      'hinge-photo-tap',
      'hinge-prompt-dish-tastes-like-home',
      'hinge-bio',
      'hinge-prompt-fluent-in',
      'hinge-prompt-family-will-ask-about',
    ].map((id) => ids.indexOf(id))
    expect(order).not.toContain(-1)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('each prompt block carries its own like affordance wired to onLike', () => {
    const onLike = jest.fn()
    const tree = expand(render(WITH_PROMPTS, onLike))
    const block = findByTestID(tree, 'hinge-prompt-fluent-in')[0]
    // The block's only TouchableOpacity is the inline like
    const touchables = findAllOfType(block, 'TouchableOpacity')
    expect(touchables).toHaveLength(1)
    touchables[0].props.onPress()
    expect(onLike).toHaveBeenCalledTimes(1)
  })
})

describe('HingeCard without prompt answers — zero layout shift', () => {
  it('renders no prompt blocks when prompts is absent', () => {
    const ids = collectTestIDs(expand(render(BASE)))
    expect(ids.some((id) => id.startsWith('hinge-prompt-'))).toBe(false)
  })

  it('treats an empty prompts array exactly like an absent one', () => {
    const absent = collectTestIDs(expand(render(BASE)))
    const empty = collectTestIDs(expand(render({ ...BASE, prompts: [] })))
    expect(empty).toEqual(absent)
  })

  it('keeps the pre-#13 section order untouched', () => {
    const ids = collectTestIDs(expand(render(BASE)))
    expect(ids.indexOf('hinge-photo-tap')).toBeLessThan(ids.indexOf('hinge-bio'))
  })
})

/** Depth-first search for elements of a given (string) type. */
function findAllOfType(node: unknown, type: string): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findAllOfType(child, type))
  const el = node as ReactElement<any>
  const self = el.type === type ? [el] : []
  return [...self, ...findAllOfType(el.props?.children, type)]
}
