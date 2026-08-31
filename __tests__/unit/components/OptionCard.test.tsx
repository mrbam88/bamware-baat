/**
 * OptionCard unit tests (issue #3).
 *
 * Same approach as MatchBadge.test.tsx: the shared setup.ts mocks
 * react-native down to { Platform }, so this file supplies a richer mock,
 * invokes the (hook-free) component directly, and inspects the returned
 * element tree — no renderer needed.
 */
import type { ReactElement } from 'react'
import { Colors } from '../../../src/theme'
import { OptionCard } from '../../../src/components/OptionCard'
import { Text } from '../../../src/components/Text'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles, flatten: (s: unknown) => s },
}))
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }))

/** Depth-first search of an element tree for elements of a given type. */
function findByType(node: unknown, type: unknown): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByType(child, type))
  const el = node as ReactElement<any>
  const self = el.type === type ? [el] : []
  return [...self, ...findByType(el.props?.children, type)]
}

function render(selected: boolean) {
  return OptionCard({
    label: 'Urdu',
    description: 'Shayari, tehzeeb, and late-night ghazals',
    selected,
    onPress: jest.fn(),
    testID: 'language-urdu',
  }) as ReactElement<any>
}

describe('OptionCard', () => {
  it('renders the label and description', () => {
    const tree = render(false)
    const texts = findByType(tree, Text)
    const contents = texts.map((t) => t.props.children)
    expect(contents).toContain('Urdu')
    expect(contents).toContain('Shayari, tehzeeb, and late-night ghazals')
  })

  it('exposes selection state for accessibility and testID for Maestro', () => {
    const tree = render(true)
    expect(tree.props.testID).toBe('language-urdu')
    expect(tree.props.accessibilityState).toEqual({ selected: true })
    expect(render(false).props.accessibilityState).toEqual({ selected: false })
  })

  it('shows the check icon only when selected', () => {
    expect(findByType(render(true), 'Feather')).toHaveLength(1)
    expect(findByType(render(false), 'Feather')).toHaveLength(0)
  })

  it('highlights the label with the accent token when selected', () => {
    const [label] = findByType(render(true), Text)
    expect(label.props.color).toBe(Colors.accent)
    const [unselectedLabel] = findByType(render(false), Text)
    expect(unselectedLabel.props.color).toBe(Colors.textPrimary)
  })
})
