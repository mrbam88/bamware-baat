import { authClient } from './client'
import tenant from '../config/app.config'
import * as storage from '../lib/storage'

export interface LoginResponse {
  tokens: { accessToken: string; refreshToken: string }
  user: { userId: string; email: string; name: string; role: string; tenantId: string; emailVerified?: boolean }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await authClient.post<LoginResponse>('/auth/login', {
    email,
    password,
    tenantId: tenant.tenantId,
  })
  return data
}

export async function register(email: string, password: string, name: string): Promise<LoginResponse> {
  const { data } = await authClient.post<LoginResponse>('/auth/register', {
    email,
    password,
    name,
    tenantId: tenant.tenantId,
  })
  return data
}

export type SocialProvider = 'apple' | 'google'

export interface SocialLoginParams {
  provider: SocialProvider
  idToken: string
  /**
   * Display name, when the provider shares one. Apple only returns the user's
   * full name on the FIRST authorization, so it's forwarded when present and
   * omitted otherwise.
   */
  name?: string
}

/**
 * Exchange a native SSO identity token for Bamware tokens.
 * Contract: mrbam88/bamware-auth-service#2 — the response shape is identical
 * to /auth/login, so token handling downstream is shared with `login`.
 */
export async function socialLogin({ provider, idToken, name }: SocialLoginParams): Promise<LoginResponse> {
  const { data } = await authClient.post<LoginResponse>('/auth/social', {
    provider,
    idToken,
    ...(name ? { name } : {}),
    tenantId: tenant.tenantId,
  })
  return data
}

/**
 * Always returns void — the server intentionally 200s regardless of whether
 * the email is registered, so we don't leak account existence.
 */
export async function forgotPassword(email: string): Promise<void> {
  await authClient.post('/auth/forgot-password', { email, tenantId: tenant.tenantId })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await authClient.post('/auth/reset-password', { token, password })
}

export async function verifyEmail(token: string): Promise<void> {
  await authClient.post('/auth/verify-email', { token })
}

/**
 * Re-send the verification email for the currently signed-in user. The
 * caller's access token is added by the authClient request interceptor.
 */
export async function requestEmailVerification(): Promise<void> {
  const token = await storage.getItem('access_token')
  if (!token) throw new Error('Not authenticated')
  await authClient.post('/auth/verify-email/request', undefined, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/**
 * Delete the auth-service account record for the signed-in user (issue #18):
 * user record removed, tokens revoked. Must be called BEFORE local tokens are
 * cleared — the bearer token is read from storage like requestEmailVerification.
 *
 * Contract (service PR in flight): DELETE /auth/account → 200 {ok:true}.
 * Idempotent-friendly — 404 (account already gone) is treated as success.
 */
export async function deleteAccount(): Promise<void> {
  const token = await storage.getItem('access_token')
  if (!token) throw new Error('Not authenticated')
  try {
    await authClient.delete('/auth/account', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (err: any) {
    if (err?.response?.status === 404) return
    throw err
  }
}
