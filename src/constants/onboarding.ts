/**
 * Onboarding wizard shell constants (issue #3).
 *
 * Wizard order:
 *   1 profile → 2 photos → 3 looking-for → 4 languages → 5 roots →
 *   6 faith → 7 family → 8 tags
 *
 * The cultural steps (3–7) sit BEFORE tags on purpose: AuthGate derives
 * wizard completeness from server-visible fields (photos + tags), and the
 * dating service does not persist the cultural fields yet (its
 * UpdateProfileSchema strips unknown keys). Keeping tags as the final,
 * server-verifiable step means the wizard can never be skipped by an app
 * relaunch mid-flow.
 */
export const ONBOARDING_TOTAL_STEPS = 8

/** Option card shape shared by all cultural steps: label + description + check. */
export interface OnboardingOption<V extends string = string> {
  value: V
  label: string
  description: string
}
