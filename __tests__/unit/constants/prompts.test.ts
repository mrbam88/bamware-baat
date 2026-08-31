/**
 * Prompt catalog contract tests (issue #13).
 */
import {
  PROFILE_PROMPTS,
  MAX_PROMPT_ANSWERS,
  MAX_PROMPT_ANSWER_LENGTH,
  getPromptById,
  promptLabel,
} from '../../../src/constants/prompts'

describe('PROFILE_PROMPTS catalog', () => {
  it('ships 10–12 prompts (issue #13 scope)', () => {
    expect(PROFILE_PROMPTS.length).toBeGreaterThanOrEqual(10)
    expect(PROFILE_PROMPTS.length).toBeLessThanOrEqual(12)
  })

  it('includes the three prompts named in the issue, verbatim', () => {
    const labels = PROFILE_PROMPTS.map((p) => p.label)
    expect(labels).toEqual(expect.arrayContaining([
      'The dish that tastes like home…',
      'My family will ask you about…',
      'Fluent in… feelings included',
    ]))
  })

  it('has unique, slug-safe ids (they flow into testIDs and the wire)', () => {
    const ids = PROFILE_PROMPTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('has non-empty labels that fit comfortably above a 150-char answer', () => {
    for (const p of PROFILE_PROMPTS) {
      expect(p.label.trim().length).toBeGreaterThan(0)
      expect(p.label.length).toBeLessThanOrEqual(60)
    }
  })

  it('pins the service contract limits', () => {
    expect(MAX_PROMPT_ANSWERS).toBe(3)
    expect(MAX_PROMPT_ANSWER_LENGTH).toBe(150)
  })
})

describe('getPromptById', () => {
  it('finds catalog entries and misses unknown ids', () => {
    expect(getPromptById('fluent-in')?.label).toBe('Fluent in… feelings included')
    expect(getPromptById('nope')).toBeUndefined()
  })
})

describe('promptLabel', () => {
  it('returns the catalog label for known ids', () => {
    expect(promptLabel('dish-tastes-like-home')).toBe('The dish that tastes like home…')
  })

  it('humanizes unknown slugs (answers from older/newer catalogs still render)', () => {
    expect(promptLabel('ideal-sunday')).toBe('Ideal sunday')
    expect(promptLabel('green_flag')).toBe('Green flag')
  })

  it('is graceful with empty input', () => {
    expect(promptLabel('')).toBe('')
    expect(promptLabel('-')).toBe('')
  })
})
