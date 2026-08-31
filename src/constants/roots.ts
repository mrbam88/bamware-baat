import type { OnboardingOption } from './onboarding'

/**
 * "Where's family from?" — multi-select, regions + diaspora.
 * Diaspora kids welcome: pick every place that raised you.
 */
export const ROOTS_OPTIONS: OnboardingOption[] = [
  { value: 'punjab',          label: 'Punjab',                    description: 'Lahore to Ludhiana — either side of the border' },
  { value: 'sindh',           label: 'Sindh',                     description: 'Karachi hustle, Sufi soul' },
  { value: 'kpk',             label: 'Khyber Pakhtunkhwa',        description: 'Peshawar to the northern valleys' },
  { value: 'balochistan',     label: 'Balochistan',               description: 'Coast, desert, and deep hospitality' },
  { value: 'kashmir',         label: 'Kashmir',                   description: 'The valley, Jammu, or Azad Kashmir' },
  { value: 'north-india',     label: 'North India',               description: 'Delhi, UP, Bihar, Rajasthan — the Hindi heartland' },
  { value: 'west-india',      label: 'Gujarat & the west',        description: 'Gujarat, Maharashtra, Goa' },
  { value: 'south-india',     label: 'South India',               description: 'Tamil Nadu, Kerala, Karnataka, Andhra, Telangana' },
  { value: 'east-india',      label: 'East & Northeast India',    description: 'Bengal, Odisha, Assam, and the seven sisters' },
  { value: 'bangladesh',      label: 'Bangladesh',                description: 'Sylhet to Chittagong, Dhaka in between' },
  { value: 'sri-lanka',       label: 'Sri Lanka',                 description: 'Colombo, Jaffna, Kandy — the whole island' },
  { value: 'nepal',           label: 'Nepal',                     description: 'Kathmandu valley to the high Himalaya' },
  { value: 'afghanistan',     label: 'Afghanistan',               description: 'Kabul, Kandahar, and everywhere the diaspora landed' },
  { value: 'indo-caribbean',  label: 'Indo-Caribbean',            description: 'Trinidad, Guyana, Suriname — kept the culture alive' },
  { value: 'east-africa',     label: 'East African desi',         description: 'Nairobi, Kampala, Dar — the twice-migrated' },
  { value: 'gulf',            label: 'Gulf-raised',               description: 'Dubai, Doha, Jeddah — third-culture kids' },
  { value: 'diaspora-born',   label: 'Born & raised abroad',      description: 'NYC, London, Toronto… home is here too' },
]

export const MIN_SELECTED_ROOTS = 1
export const MAX_SELECTED_ROOTS = 4
