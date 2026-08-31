import { datingClient } from './client'

export interface Match {
  matchId: string
  matchedUserId: string
  createdAt: string
  /** Shared interest the pair matched on (e.g. "analog photography"). Optional — older matches may lack it. */
  commonground?: string
  /** Matched user's display name/photo — optional, server-enriched. */
  matchedName?: string
  matchedPhoto?: string
}

export interface Message {
  messageId: string
  senderId: string
  content: string
  createdAt: string
}

export interface MatchPage {
  matches: Match[]
  nextCursor?: string
}

export async function fetchMatches(cursor?: string): Promise<MatchPage> {
  const { data } = await datingClient.get<MatchPage>('/matches', {
    params: cursor ? { cursor } : {},
  })
  return data
}

export async function fetchMessages(matchId: string, cursor?: string): Promise<{ messages: Message[]; nextCursor?: string }> {
  const { data } = await datingClient.get(`/matches/${matchId}/messages`, {
    params: cursor ? { cursor } : {},
  })
  return data
}

export async function sendMessage(matchId: string, content: string): Promise<Message> {
  const { data } = await datingClient.post(`/matches/${matchId}/messages`, { content })
  return data
}
