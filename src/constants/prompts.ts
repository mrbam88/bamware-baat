/**
 * Profile prompt catalog (issue #13) — the Baat-flavored questions members
 * answer on their profile. The service stores only `{ promptId, answer }`
 * pairs (see the dating service PromptAnswerSchema); this catalog is the
 * app-side source of truth for what each promptId means on screen.
 *
 * Ids are stable slugs — NEVER rename one once shipped, or existing answers
 * lose their label (they fall back to a humanized slug, see promptLabel).
 */

export interface ProfilePrompt {
  /** Stable slug persisted on the wire as promptId. */
  id: string
  /** The prompt as shown to members. Culture-forward, warm, a little playful. */
  label: string
}

export const PROFILE_PROMPTS: ProfilePrompt[] = [
  // The three from issue #13 — the launch signature set.
  { id: 'dish-tastes-like-home',    label: 'The dish that tastes like home…' },
  { id: 'family-will-ask-about',    label: 'My family will ask you about…' },
  { id: 'fluent-in',                label: 'Fluent in… feelings included' },
  // Food & chai
  { id: 'chai-order',               label: 'My chai order says everything, mainly…' },
  { id: 'late-night-comfort-meal',  label: 'My 2am comfort meal is…' },
  // Family & the aunty network
  { id: 'aunty-network-report',     label: 'The aunty network will report that I…' },
  { id: 'tradition-keeping-forever',label: 'The tradition I’m keeping forever is…' },
  // Languages
  { id: 'switch-languages-when',    label: 'I switch languages mid-sentence when…' },
  // Festivals & weddings
  { id: 'festival-non-negotiable',  label: 'My festival non-negotiable is…' },
  { id: 'at-weddings-find-me',      label: 'At weddings, you’ll find me…' },
  // Music & diaspora identity
  { id: 'family-dance-song',        label: 'The song that gets the whole family dancing…' },
  { id: 'two-time-zones',           label: 'My heart runs on two time zones because…' },
]

/** Profiles carry at most 3 answered prompts (mirrors service PromptsFieldSchema). */
export const MAX_PROMPT_ANSWERS = 3

/** Answers are 1–150 chars (mirrors service PromptAnswerSchema). */
export const MAX_PROMPT_ANSWER_LENGTH = 150

export function getPromptById(id: string): ProfilePrompt | undefined {
  return PROFILE_PROMPTS.find((p) => p.id === id)
}

/**
 * Display label for a promptId: catalog label when known, otherwise a
 * humanized slug ("ideal-sunday" → "Ideal sunday") so answers written against
 * an older/newer catalog still render something sensible.
 */
export function promptLabel(promptId: string): string {
  const known = getPromptById(promptId)
  if (known) return known.label
  const words = promptId.replace(/[-_]+/g, ' ').trim()
  if (words.length === 0) return ''
  return words[0].toUpperCase() + words.slice(1)
}
