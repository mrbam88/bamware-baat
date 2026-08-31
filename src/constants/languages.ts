import type { OnboardingOption } from './onboarding'

/**
 * "Languages that feel like home" — multi-select.
 * Fluency is not the bar: heritage speakers, rusty vocab, and accents all count.
 */
export const LANGUAGE_OPTIONS: OnboardingOption[] = [
  { value: 'urdu',      label: 'Urdu',      description: 'Shayari, tehzeeb, and late-night ghazals' },
  { value: 'hindi',     label: 'Hindi',     description: 'Bollywood monologues, delivered unprompted' },
  { value: 'punjabi',   label: 'Punjabi',   description: 'Loudest laugh in the room, guaranteed' },
  { value: 'bengali',   label: 'Bengali',   description: 'Poetry, adda, and strong opinions on fish' },
  { value: 'tamil',     label: 'Tamil',     description: 'Classical roots and filter-coffee debates' },
  { value: 'telugu',    label: 'Telugu',    description: 'Home sounds like Hyderabad or the coast' },
  { value: 'gujarati',  label: 'Gujarati',  description: 'Counting down the days to garba season' },
  { value: 'marathi',   label: 'Marathi',   description: 'Misal-pav loyalty runs deep' },
  { value: 'malayalam', label: 'Malayalam', description: "God's own language, obviously" },
  { value: 'kannada',   label: 'Kannada',   description: 'Bengaluru brains, old-Mysuru soul' },
  { value: 'sinhala',   label: 'Sinhala',   description: 'Island warmth in every word' },
  { value: 'nepali',    label: 'Nepali',    description: 'Mountain roots and high momo standards' },
  { value: 'pashto',    label: 'Pashto',    description: 'Landay couplets and legendary hospitality' },
  { value: 'kashmiri',  label: 'Kashmiri',  description: 'Noon chai over everything' },
  { value: 'sindhi',    label: 'Sindhi',    description: 'Ajrak pride and Sufi poetry' },
  { value: 'english',   label: 'English',   description: 'First language, only language, or code-switching between' },
]

export const MIN_SELECTED_LANGUAGES = 1
export const MAX_SELECTED_LANGUAGES = 5
