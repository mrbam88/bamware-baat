/**
 * Pure editor-state helpers for profile prompt answers (issue #13).
 *
 * The PromptEditor component keeps its React state paper-thin and delegates
 * every rule to these functions so the rules are unit-testable without a
 * renderer (same philosophy as the hook-free component pattern used across
 * this repo's tests).
 *
 * Invariants enforced here mirror the service's PromptsFieldSchema:
 * max 3 answers, unique promptIds, answers 1–150 chars after trimming.
 */
import type { PromptAnswer } from '../api/discover'
import {
  MAX_PROMPT_ANSWERS,
  MAX_PROMPT_ANSWER_LENGTH,
  PROFILE_PROMPTS,
  type ProfilePrompt,
} from '../constants/prompts'

/** Trim + hard-cap to the wire limit. The UI also caps via maxLength. */
export function sanitizeAnswer(raw: string): string {
  return raw.trim().slice(0, MAX_PROMPT_ANSWER_LENGTH)
}

/** True when a sanitized answer is persistable (1–150 chars). */
export function isAnswerValid(raw: string): boolean {
  const trimmed = raw.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_PROMPT_ANSWER_LENGTH
}

/** Characters left before the 150 cap, never negative. */
export function remainingChars(raw: string): number {
  return Math.max(0, MAX_PROMPT_ANSWER_LENGTH - raw.length)
}

export function canAddPrompt(prompts: PromptAnswer[]): boolean {
  return prompts.length < MAX_PROMPT_ANSWERS
}

/**
 * Add or replace an answer, returning a new array.
 * - Replacing keeps the answer's position in the list.
 * - Adding past MAX_PROMPT_ANSWERS is a no-op (returns the input unchanged).
 * - Answers are sanitized on the way in; an empty sanitized answer is a no-op.
 */
export function upsertAnswer(
  prompts: PromptAnswer[],
  promptId: string,
  answer: string,
): PromptAnswer[] {
  const clean = sanitizeAnswer(answer)
  if (clean.length === 0) return prompts
  const existing = prompts.findIndex((p) => p.promptId === promptId)
  if (existing >= 0) {
    return prompts.map((p, i) => (i === existing ? { promptId, answer: clean } : p))
  }
  if (!canAddPrompt(prompts)) return prompts
  return [...prompts, { promptId, answer: clean }]
}

/** Remove the answer for a promptId; no-op when it isn't answered. */
export function removeAnswer(prompts: PromptAnswer[], promptId: string): PromptAnswer[] {
  const next = prompts.filter((p) => p.promptId !== promptId)
  return next.length === prompts.length ? prompts : next
}

/**
 * Catalog entries still open for answering: everything not already answered,
 * plus the prompt currently being edited (so the picker can show it selected).
 */
export function availablePrompts(
  prompts: PromptAnswer[],
  editingPromptId?: string | null,
): ProfilePrompt[] {
  const taken = new Set(prompts.map((p) => p.promptId))
  return PROFILE_PROMPTS.filter((p) => !taken.has(p.id) || p.id === editingPromptId)
}
