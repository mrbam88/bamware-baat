import type { OnboardingOption } from './onboarding'

/**
 * "Family involvement" — single-select.
 * How close family is to your dating life. No wrong answer — it helps set
 * expectations early.
 */
export type FamilyInvolvement = 'very-involved' | 'when-serious' | 'independent' | 'complicated'

export const FAMILY_INVOLVEMENT_OPTIONS: OnboardingOption<FamilyInvolvement>[] = [
  {
    value: 'very-involved',
    label: 'Family is in the group chat',
    description: "They'll meet you early — probably with too much food",
  },
  {
    value: 'when-serious',
    label: 'Involved once it gets serious',
    description: "They'll know when I know",
  },
  {
    value: 'independent',
    label: 'My decision, my pace',
    description: "I'll loop them in on my own terms",
  },
  {
    value: 'complicated',
    label: "It's complicated",
    description: "Family is a longer conversation — and that's okay",
  },
]
