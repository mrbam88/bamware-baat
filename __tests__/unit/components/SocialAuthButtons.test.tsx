/**
 * SocialAuthButtons unit tests (issue #20).
 *
 * Same approach as MatchBadge.test.tsx: the shared setup.ts mocks
 * react-native down to { Platform }, so this file supplies a richer mock and
 * invokes the hook-free component directly, inspecting the returned element
 * tree — no renderer needed. Platform.OS is mutated between cases to cover
 * the iOS (Apple + Google) and Android (Google only) variants.
 */
import type { ReactElement } from 'react'
import { Platform } from 'react-native'
import { SocialAuthButtons } from '../../../src/components/SocialAuthButtons'
import { Button } from '../../../src/components/Button'
import { Text } from '../../../src/components/Text'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    flatten: (s: unknown) => s,
    hairlineWidth: 0.5,
  },
}))
jest.mock('@expo/vector-icons', () => ({ FontAwesome: 'FontAwesome', Feather: 'Feather' }))

/** Depth-first search of an element tree for elements of a given type. */
function findByType(node: unknown, type: unknown): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByType(child, type))
  const el = node as ReactElement<any>
  const self = el.type === type ? [el] : []
  return [...self, ...findByType(el.props?.children, type)]
}

afterEach(() => {
  ;(Platform as { OS: string }).OS = 'ios'
})

describe('SocialAuthButtons', () => {
  it('renders Apple then Google on iOS', () => {
    const tree = SocialAuthButtons({ onPress: jest.fn() })
    const buttons = findByType(tree, Button)
    expect(buttons).toHaveLength(2)
    expect(buttons[0].props.text).toBe('Continue with Apple')
    expect(buttons[0].props.testID).toBe('apple-sso-button')
    expect(buttons[1].props.text).toBe('Continue with Google')
    expect(buttons[1].props.testID).toBe('google-sso-button')
  })

  it('renders Google only on Android (Apple needs a web flow — out of scope)', () => {
    ;(Platform as { OS: string }).OS = 'android'
    const tree = SocialAuthButtons({ onPress: jest.fn() })
    const buttons = findByType(tree, Button)
    expect(buttons).toHaveLength(1)
    expect(buttons[0].props.text).toBe('Continue with Google')
  })

  it("shows an 'or' divider above the buttons", () => {
    const tree = SocialAuthButtons({ onPress: jest.fn() })
    const texts = findByType(tree, Text)
    expect(texts.some((t) => t.props.children === 'or')).toBe(true)
  })

  it('invokes onPress with the tapped provider', () => {
    const onPress = jest.fn()
    const tree = SocialAuthButtons({ onPress })
    const [apple, google] = findByType(tree, Button)
    apple.props.onPress()
    expect(onPress).toHaveBeenCalledWith('apple')
    google.props.onPress()
    expect(onPress).toHaveBeenCalledWith('google')
  })

  it('disables both buttons while an auth flow is in flight', () => {
    const tree = SocialAuthButtons({ onPress: jest.fn(), disabled: true })
    const buttons = findByType(tree, Button)
    expect(buttons).toHaveLength(2)
    for (const b of buttons) expect(b.props.disabled).toBe(true)
  })
})
