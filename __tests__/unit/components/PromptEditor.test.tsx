/**
 * PromptEditor unit tests (issue #13).
 *
 * Same approach as ProfileDetail.test.tsx: the presentational pieces
 * (PromptAnswerList, PromptEditorSheet) are hook-free, so we invoke them as
 * plain functions and inspect the returned element trees — no renderer.
 */
import type { ReactElement } from 'react'
import { PromptAnswerList, PromptEditorSheet } from '../../../src/components/PromptEditor'
import { PROFILE_PROMPTS } from '../../../src/constants/prompts'
import type { PromptAnswer } from '../../../src/api/discover'

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Modal: 'Modal',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    flatten: (s: unknown) => s,
    hairlineWidth: 0.5,
  },
}))
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }))

const ANSWERS: PromptAnswer[] = [
  { promptId: 'fluent-in', answer: 'Punjabi, sarcasm, and silence' },
  { promptId: 'chai-order', answer: 'Doodh patti. No debate.' },
]

const FULL: PromptAnswer[] = [
  ...ANSWERS,
  { promptId: 'family-will-ask-about', answer: 'Why I moved to Bushwick' },
]

/** Depth-first search for the element carrying a given testID. */
function findByTestID(node: unknown, testID: string): ReactElement<any>[] {
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap((child) => findByTestID(child, testID))
  const el = node as ReactElement<any>
  const self = el.props?.testID === testID ? [el] : []
  return [...self, ...findByTestID(el.props?.children, testID)]
}

/** Collect every string rendered anywhere below the node. */
function collectStrings(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  if (node == null || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(collectStrings)
  return collectStrings((node as ReactElement<any>).props?.children)
}

describe('PromptAnswerList', () => {
  const handlers = () => ({ onAdd: jest.fn(), onEdit: jest.fn(), onRemove: jest.fn() })

  it('renders one card per answer with the catalog label and the answer', () => {
    const tree = PromptAnswerList({ prompts: ANSWERS, ...handlers() })
    const card = findByTestID(tree, 'prompt-answer-fluent-in')
    expect(card).toHaveLength(1)
    const strings = collectStrings(card[0])
    expect(strings).toContain('Fluent in… feelings included')
    expect(strings).toContain('Punjabi, sarcasm, and silence')
  })

  it('wires edit and remove per answer', () => {
    const h = handlers()
    const tree = PromptAnswerList({ prompts: ANSWERS, ...h })
    findByTestID(tree, 'prompt-edit-chai-order')[0].props.onPress()
    expect(h.onEdit).toHaveBeenCalledWith(ANSWERS[1])
    findByTestID(tree, 'prompt-remove-fluent-in')[0].props.onPress()
    expect(h.onRemove).toHaveBeenCalledWith(ANSWERS[0])
  })

  it('shows the add CTA below 3 answers and wires it', () => {
    const h = handlers()
    const tree = PromptAnswerList({ prompts: ANSWERS, ...h })
    const add = findByTestID(tree, 'prompt-add')
    expect(add).toHaveLength(1)
    add[0].props.onPress()
    expect(h.onAdd).toHaveBeenCalled()
  })

  it('hides the add CTA at the 3-answer cap', () => {
    const tree = PromptAnswerList({ prompts: FULL, ...handlers() })
    expect(findByTestID(tree, 'prompt-add')).toHaveLength(0)
  })

  it('renders only the add CTA when nothing is answered yet', () => {
    const tree = PromptAnswerList({ prompts: [], ...handlers() })
    expect(findByTestID(tree, 'prompt-add')).toHaveLength(1)
    expect(findByTestID(tree, 'prompt-answer-fluent-in')).toHaveLength(0)
  })
})

describe('PromptEditorSheet', () => {
  const base = () => ({
    visible: true,
    answer: '',
    options: PROFILE_PROMPTS,
    onPickPrompt: jest.fn(),
    onChangeAnswer: jest.fn(),
    onSave: jest.fn(),
    onClose: jest.fn(),
  })

  it('starts in the picker stage and lists the offered prompts', () => {
    const props = { ...base(), promptId: null }
    const tree = PromptEditorSheet(props)
    expect(findByTestID(tree, 'prompt-picker')).toHaveLength(1)
    expect(findByTestID(tree, 'prompt-answer-editor')).toHaveLength(0)
    for (const p of PROFILE_PROMPTS) {
      expect(findByTestID(tree, `prompt-option-${p.id}`)).toHaveLength(1)
    }
  })

  it('picking a prompt reports its id', () => {
    const props = { ...base(), promptId: null }
    const tree = PromptEditorSheet(props)
    findByTestID(tree, 'prompt-option-fluent-in')[0].props.onPress()
    expect(props.onPickPrompt).toHaveBeenCalledWith('fluent-in')
  })

  it('shows the answer editor once a prompt is picked, 150-char capped', () => {
    const props = { ...base(), promptId: 'fluent-in', answer: 'Urdu' }
    const tree = PromptEditorSheet(props)
    expect(findByTestID(tree, 'prompt-picker')).toHaveLength(0)
    const input = findByTestID(tree, 'prompt-answer-input')
    expect(input).toHaveLength(1)
    expect(input[0].props.value).toBe('Urdu')
    expect(input[0].props.maxLength).toBe(150)
    input[0].props.onChangeText('Urdu and')
    expect(props.onChangeAnswer).toHaveBeenCalledWith('Urdu and')
    expect(collectStrings(findByTestID(tree, 'prompt-counter')[0])).toContain('146 left')
  })

  it('disables save on an empty/whitespace answer, enables on a valid one', () => {
    const empty = PromptEditorSheet({ ...base(), promptId: 'fluent-in', answer: '  ' })
    expect(findByTestID(empty, 'prompt-save')[0].props.disabled).toBe(true)

    const props = { ...base(), promptId: 'fluent-in', answer: 'Urdu' }
    const valid = PromptEditorSheet(props)
    const save = findByTestID(valid, 'prompt-save')[0]
    expect(save.props.disabled).toBe(false)
    save.props.onPress()
    expect(props.onSave).toHaveBeenCalled()
  })

  it('disables save while a save is in flight', () => {
    const tree = PromptEditorSheet({ ...base(), promptId: 'fluent-in', answer: 'Urdu', saving: true })
    expect(findByTestID(tree, 'prompt-save')[0].props.disabled).toBe(true)
  })

  it('wires the close affordance', () => {
    const props = { ...base(), promptId: null }
    const tree = PromptEditorSheet(props)
    findByTestID(tree, 'prompt-sheet-close')[0].props.onPress()
    expect(props.onClose).toHaveBeenCalled()
  })
})
