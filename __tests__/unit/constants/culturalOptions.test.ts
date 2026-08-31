/**
 * Cultural onboarding option lists (issue #3) — content sanity checks.
 * These lists feed the option cards directly, so bad data here is a broken
 * wizard screen.
 */
import type { OnboardingOption } from '../../../src/constants/onboarding'
import { ONBOARDING_TOTAL_STEPS } from '../../../src/constants/onboarding'
import { LOOKING_FOR_OPTIONS } from '../../../src/constants/lookingFor'
import {
  LANGUAGE_OPTIONS,
  MAX_SELECTED_LANGUAGES,
  MIN_SELECTED_LANGUAGES,
} from '../../../src/constants/languages'
import { ROOTS_OPTIONS, MAX_SELECTED_ROOTS, MIN_SELECTED_ROOTS } from '../../../src/constants/roots'
import { FAITH_OPTIONS } from '../../../src/constants/faith'
import { FAMILY_INVOLVEMENT_OPTIONS } from '../../../src/constants/familyInvolvement'

const ALL_LISTS: [string, OnboardingOption[]][] = [
  ['LOOKING_FOR_OPTIONS', LOOKING_FOR_OPTIONS],
  ['LANGUAGE_OPTIONS', LANGUAGE_OPTIONS],
  ['ROOTS_OPTIONS', ROOTS_OPTIONS],
  ['FAITH_OPTIONS', FAITH_OPTIONS],
  ['FAMILY_INVOLVEMENT_OPTIONS', FAMILY_INVOLVEMENT_OPTIONS],
]

describe.each(ALL_LISTS)('%s', (_name, options) => {
  it('is non-empty', () => {
    expect(options.length).toBeGreaterThan(0)
  })

  it('has unique values', () => {
    const values = options.map((o) => o.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('has url/testID-safe kebab-case values', () => {
    for (const o of options) expect(o.value).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('has a label and description on every option (option-card contract)', () => {
    for (const o of options) {
      expect(o.label.trim().length).toBeGreaterThan(0)
      expect(o.description.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('languages', () => {
  it('covers the core Pan-South Asian languages', () => {
    const values = LANGUAGE_OPTIONS.map((o) => o.value)
    for (const expected of [
      'urdu', 'hindi', 'punjabi', 'bengali', 'tamil', 'telugu', 'gujarati',
      'marathi', 'malayalam', 'kannada', 'sinhala', 'nepali', 'pashto',
      'kashmiri', 'english',
    ]) {
      expect(values).toContain(expected)
    }
  })

  it('has a satisfiable selection range', () => {
    expect(MIN_SELECTED_LANGUAGES).toBeGreaterThanOrEqual(1)
    expect(MAX_SELECTED_LANGUAGES).toBeGreaterThanOrEqual(MIN_SELECTED_LANGUAGES)
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThanOrEqual(MAX_SELECTED_LANGUAGES)
  })
})

describe('roots', () => {
  it('covers regions and the diaspora', () => {
    const values = ROOTS_OPTIONS.map((o) => o.value)
    for (const expected of [
      'punjab', 'sindh', 'kashmir', 'south-india', 'bangladesh', 'sri-lanka',
      'nepal', 'afghanistan', 'indo-caribbean', 'east-africa', 'gulf', 'diaspora-born',
    ]) {
      expect(values).toContain(expected)
    }
  })

  it('has a satisfiable selection range', () => {
    expect(MIN_SELECTED_ROOTS).toBeGreaterThanOrEqual(1)
    expect(MAX_SELECTED_ROOTS).toBeGreaterThanOrEqual(MIN_SELECTED_ROOTS)
    expect(ROOTS_OPTIONS.length).toBeGreaterThanOrEqual(MAX_SELECTED_ROOTS)
  })
})

describe('faith', () => {
  it('covers the major faiths plus opt-outs', () => {
    const values = FAITH_OPTIONS.map((o) => o.value)
    for (const expected of [
      'islam', 'hinduism', 'sikhism', 'christianity', 'buddhism', 'jainism',
      'zoroastrianism', 'spiritual', 'prefer-not-to-say',
    ]) {
      expect(values).toContain(expected)
    }
  })
})

describe('wizard shell', () => {
  it('counts 8 steps: profile, photos, 5 cultural steps, tags', () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(8)
  })
})
