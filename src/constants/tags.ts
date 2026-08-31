export interface TagCategory {
  id: string
  label: string
  tags: string[]
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'interests',
    label: 'Interests',
    tags: ['hiking', 'cooking', 'music', 'art', 'travel', 'fitness', 'reading', 'gaming', 'photography', 'yoga', 'dancing', 'foodie', 'sports', 'movies', 'coffee', 'wine'],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    tags: ['dog lover', 'cat person', 'night owl', 'early bird', 'homebody', 'adventurous', 'introvert', 'extrovert', 'plant parent'],
  },
  {
    id: 'looking_for',
    label: 'Looking For',
    tags: ['relationship', 'casual dating', 'friendship', 'open to anything'],
  },
  {
    id: 'basics',
    label: 'Basics',
    tags: ['drinks socially', "doesn't drink", 'smokes', "doesn't smoke", 'wants kids', "doesn't want kids", 'has kids'],
  },
]

export const MAX_SELECTED_TAGS = 10
export const MIN_SELECTED_TAGS = 3
