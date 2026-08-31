import { datingClient } from './client'
import type { LookingFor } from '../constants/lookingFor'
import type { Faith } from '../constants/faith'
import type { FamilyInvolvement } from '../constants/familyInvolvement'
import type { PromptAnswer } from './discover'

export type { PromptAnswer }

export type Gender = 'man' | 'woman' | 'nonbinary'
export type Seeking = 'men' | 'women' | 'everyone'
export type Borough = 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island'

export type { LookingFor, Faith, FamilyInvolvement }

/**
 * Cultural-matching fields collected by the onboarding wizard (issue #3).
 *
 * CONTRACT NOTE (verified against the dating service main, 2026-07-23):
 * the service's UpdateProfileSchema is a non-strict Zod object and its
 * validate() middleware replaces req.body with the parsed result — unknown
 * keys are silently STRIPPED, not rejected. PATCHing these fields returns
 * 200 today but they are not persisted, and GET /profile/me never returns
 * them. Everything here is optional so the app tolerates that; a
 * service-side schema addition is required before they round-trip.
 */
export interface CulturalProfileFields {
  lookingFor?: LookingFor
  languages?: string[]
  roots?: string[]
  faith?: Faith
  familyInvolvement?: FamilyInvolvement
}

export interface Profile extends CulturalProfileFields {
  userId: string
  tenantId: string
  email: string
  name: string
  age: number
  gender: Gender
  seeking: Seeking
  borough: Borough
  bio: string
  photos: string[]
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  /** Up to 3 prompt answers (issue #13). Optional on the wire — absent means none. */
  prompts?: PromptAnswer[]
}

export interface CreateProfileRequest {
  age: number
  gender: Gender
  seeking: Seeking
  borough: Borough
  bio?: string
  tags?: string[]
  /** PATCH semantics on the service: the array replaces wholesale; [] clears. */
  prompts?: PromptAnswer[]
}

export async function createProfile(payload: CreateProfileRequest): Promise<Profile> {
  const { data } = await datingClient.post<Profile>('/profile', payload)
  return data
}

export type UpdateProfileRequest = Partial<CreateProfileRequest> & CulturalProfileFields

export async function updateMyProfile(patch: UpdateProfileRequest): Promise<Profile> {
  const { data } = await datingClient.patch<Profile>('/profile/me', patch)
  return data
}

export async function getMyProfile(): Promise<Profile | null> {
  try {
    const { data } = await datingClient.get<Profile>('/profile/me')
    return data
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

/**
 * Delete every dating-service record for the signed-in user (issue #18):
 * profile, photos, swipes, matches, messages, device tokens.
 *
 * Contract (service PR in flight): DELETE /profile/me/account → 200 {ok:true}.
 * Idempotent-friendly — 404 means the data is already gone (e.g. re-running
 * the flow after a partial failure) and is treated as success.
 */
export async function deleteMyAccountData(): Promise<void> {
  try {
    await datingClient.delete('/profile/me/account')
  } catch (err: any) {
    if (err?.response?.status === 404) return
    throw err
  }
}
