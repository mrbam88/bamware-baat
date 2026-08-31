import type { OnboardingOption } from './onboarding'

/** "What I'm looking for" — single-select. No wrong answer; it sets expectations early. */
export type LookingFor = 'marriage' | 'serious' | 'open' | 'figuring-it-out'

export const LOOKING_FOR_OPTIONS: OnboardingOption<LookingFor>[] = [
  {
    value: 'marriage',
    label: 'Marriage-minded',
    description: 'Ready for the real thing — nikah, pheras, or city hall',
  },
  {
    value: 'serious',
    label: 'A serious relationship',
    description: 'Building toward something real, at our own pace',
  },
  {
    value: 'open',
    label: 'Open to seeing where it goes',
    description: 'Starting with chai and good conversation',
  },
  {
    value: 'figuring-it-out',
    label: 'Still figuring it out',
    description: "An honest answer — and a perfectly good one",
  },
]
