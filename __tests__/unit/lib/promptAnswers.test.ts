/**
 * Editor-state rules for prompt answers (issue #13). Pure functions — the
 * PromptEditor component delegates every rule here.
 */
import type { PromptAnswer } from '../../../src/api/discover'
import { PROFILE_PROMPTS } from '../../../src/constants/prompts'
import {
  availablePrompts,
  canAddPrompt,
  isAnswerValid,
  remainingChars,
  removeAnswer,
  sanitizeAnswer,
  upsertAnswer,
} from '../../../src/lib/promptAnswers'

const A = (promptId: string, answer = 'x'): PromptAnswer => ({ promptId, answer })

const THREE: PromptAnswer[] = [A('fluent-in'), A('chai-order'), A('family-will-ask-about')]

describe('sanitizeAnswer / isAnswerValid / remainingChars', () => {
  it('trims and caps at 150 chars', () => {
    expect(sanitizeAnswer('  chai  ')).toBe('chai')
    expect(sanitizeAnswer('a'.repeat(200))).toHaveLength(150)
  })

  it('accepts 1–150 chars after trimming, rejects empty/whitespace/overlong', () => {
    expect(isAnswerValid('a')).toBe(true)
    expect(isAnswerValid('a'.repeat(150))).toBe(true)
    expect(isAnswerValid('')).toBe(false)
    expect(isAnswerValid('   ')).toBe(false)
    expect(isAnswerValid('a'.repeat(151))).toBe(false)
  })

  it('counts down from 150 and never goes negative', () => {
    expect(remainingChars('')).toBe(150)
    expect(remainingChars('chai')).toBe(146)
    expect(remainingChars('a'.repeat(160))).toBe(0)
  })
})

describe('upsertAnswer', () => {
  it('adds a new answer, sanitized', () => {
    const next = upsertAnswer([], 'fluent-in', '  Punjabi, sarcasm, and silence  ')
    expect(next).toEqual([{ promptId: 'fluent-in', answer: 'Punjabi, sarcasm, and silence' }])
  })

  it('replaces an existing answer in place (position preserved)', () => {
    const next = upsertAnswer(THREE, 'chai-order', 'doodh patti, no debate')
    expect(next.map((p) => p.promptId)).toEqual(['fluent-in', 'chai-order', 'family-will-ask-about'])
    expect(next[1].answer).toBe('doodh patti, no debate')
  })

  it('refuses a 4th answer (max 3, mirrors the service schema)', () => {
    expect(upsertAnswer(THREE, 'at-weddings-find-me', 'on the dance floor')).toBe(THREE)
  })

  it('treats an all-whitespace answer as a no-op', () => {
    expect(upsertAnswer([], 'fluent-in', '   ')).toEqual([])
  })

  it('does not mutate the input array', () => {
    const input = [A('fluent-in', 'before')]
    upsertAnswer(input, 'fluent-in', 'after')
    expect(input[0].answer).toBe('before')
  })
})

describe('removeAnswer', () => {
  it('removes by promptId', () => {
    expect(removeAnswer(THREE, 'chai-order').map((p) => p.promptId))
      .toEqual(['fluent-in', 'family-will-ask-about'])
  })

  it('is a no-op (same reference) for an unanswered promptId', () => {
    expect(removeAnswer(THREE, 'nope')).toBe(THREE)
  })
})

describe('canAddPrompt', () => {
  it('allows up to 3', () => {
    expect(canAddPrompt([])).toBe(true)
    expect(canAddPrompt(THREE.slice(0, 2))).toBe(true)
    expect(canAddPrompt(THREE)).toBe(false)
  })
})

describe('availablePrompts', () => {
  it('offers the full catalog when nothing is answered', () => {
    expect(availablePrompts([])).toEqual(PROFILE_PROMPTS)
  })

  it('excludes answered prompts', () => {
    const ids = availablePrompts(THREE).map((p) => p.id)
    expect(ids).not.toContain('fluent-in')
    expect(ids).not.toContain('chai-order')
    expect(ids).toHaveLength(PROFILE_PROMPTS.length - 3)
  })

  it('keeps the prompt currently being edited in the list', () => {
    const ids = availablePrompts(THREE, 'chai-order').map((p) => p.id)
    expect(ids).toContain('chai-order')
    expect(ids).not.toContain('fluent-in')
  })
})
