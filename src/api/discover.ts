import { datingClient } from './client'

/** Profile prompt answer (service issue #5). Mirrors PromptAnswerSchema in the dating service. */
export interface PromptAnswer {
  promptId: string
  answer: string
}

export interface Profile {
  userId: string
  name: string
  age: number
  gender: string
  seeking: string
  borough: string
  bio: string
  photos: string[]
  /** Interest tags. Service defaults to [] but older cached payloads may omit it. */
  tags?: string[]
  /** Up to 3 prompt answers. Optional on the wire — absent means none. */
  prompts?: PromptAnswer[]
  /** Compatibility score 0–100. Optional — backend doesn't send it yet; render nothing when absent. */
  matchScore?: number
  /** Short "what you share" line for the match modal. Optional — backend doesn't send it yet. */
  commonground?: string
}

export async function fetchDiscover(limit = 20): Promise<Profile[]> {
  const { data } = await datingClient.get<Profile[]>('/discover', { params: { limit } })
  return data
}

export async function swipe(targetUserId: string, action: 'like' | 'pass'): Promise<{ matched: boolean; matchId?: string }> {
  const { data } = await datingClient.post('/swipe', { targetUserId, action })
  return data
}
