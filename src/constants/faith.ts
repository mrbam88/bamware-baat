import type { OnboardingOption } from './onboarding'

/** "Faith & beliefs" — single-select. No wrong answer; share what feels right. */
export type Faith =
  | 'islam'
  | 'hinduism'
  | 'sikhism'
  | 'christianity'
  | 'buddhism'
  | 'jainism'
  | 'zoroastrianism'
  | 'spiritual'
  | 'prefer-not-to-say'

export const FAITH_OPTIONS: OnboardingOption<Faith>[] = [
  { value: 'islam',             label: 'Islam',                    description: 'Practicing, cultural, or somewhere on the journey' },
  { value: 'hinduism',          label: 'Hinduism',                 description: 'Daily puja or Diwali-with-the-family — all of it counts' },
  { value: 'sikhism',           label: 'Sikhism',                  description: 'From daily paath to Vaisakhi visits' },
  { value: 'christianity',      label: 'Christianity',             description: 'Goan, Keralite, Punjabi — many South Asian traditions' },
  { value: 'buddhism',          label: 'Buddhism',                 description: 'Practice, philosophy, or heritage' },
  { value: 'jainism',           label: 'Jainism',                  description: 'Ahimsa first, everything else after' },
  { value: 'zoroastrianism',    label: 'Zoroastrianism',           description: 'Parsi and Irani heritage, carried proudly' },
  { value: 'spiritual',         label: 'Spiritual, not religious', description: 'Faith in something — labels optional' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say',        description: "Totally fine — share when you're ready" },
]
