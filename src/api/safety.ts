import { datingClient } from './client'

/**
 * Safety endpoints — block & report (issue #11).
 *
 * Contract verified against the dating service main
 * (src/schemas/blockSchemas.ts, src/schemas/reportSchemas.ts):
 * - POST /blocks  { targetUserId }         → 201 BlockResponse
 * - POST /reports { targetUserId, reason } → 201 ReportResponse
 *
 * Blocking is mutual & server-enforced: blocked pairs are excluded from
 * matches/discover and message sends fail with 403.
 */

export const REPORT_REASONS = [
  'fake_profile',
  'harassment',
  'inappropriate_photos',
  'other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export interface BlockResponse {
  targetUserId: string
  createdAt: string
}

export interface ReportResponse {
  reportId: string
  targetUserId: string
  reason: ReportReason
  createdAt: string
}

export async function block(userId: string): Promise<BlockResponse> {
  const { data } = await datingClient.post<BlockResponse>('/blocks', { targetUserId: userId })
  return data
}

export async function report(userId: string, reason: ReportReason): Promise<ReportResponse> {
  const { data } = await datingClient.post<ReportResponse>('/reports', { targetUserId: userId, reason })
  return data
}
