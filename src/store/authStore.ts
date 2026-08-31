import { create } from 'zustand'
import * as storage from '../lib/storage'
import * as biometricAuth from '../lib/biometricAuth'
import {
  login as apiLogin,
  register as apiRegister,
  socialLogin as apiSocialLogin,
  type SocialProvider,
  deleteAccount as apiDeleteAuthAccount,
} from '../api/auth'
import { getSocialCredential } from '../lib/socialAuth'
import { deleteMyAccountData as apiDeleteAccountData } from '../api/profile'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { runLogoutCallback } from '../lib/notifications'

interface AuthUser {
  userId: string
  email: string
  name: string
  tenantId: string
  emailVerified?: boolean
}

export interface LoginOptions {
  /** Persist the email for prefill (and allow the biometric enrollment offer). */
  rememberMe?: boolean
}

/** In-memory only — never persisted. Cleared as soon as the offer is resolved. */
interface BiometricOffer {
  email: string
  password: string
  /** UI label for the modality: "Face ID", "Touch ID", … */
  label: string
}

export type BiometricLoginResult = 'success' | 'cancelled' | 'failed'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  /** Pending "Enable Face ID sign-in?" offer, shown by BiometricEnrollPrompt at root. */
  biometricOffer: BiometricOffer | null
  login: (email: string, password: string, options?: LoginOptions) => Promise<void>
  loginWithBiometrics: () => Promise<BiometricLoginResult>
  acceptBiometricOffer: () => Promise<boolean>
  declineBiometricOffer: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  /**
   * Native SSO flow → idToken → POST /auth/social → persist tokens exactly
   * like `login`. Resolves without signing in when the user dismisses the
   * native sheet (silent no-op).
   */
  socialLogin: (provider: SocialProvider) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  sessionExpired: () => void
  hydrate: () => Promise<void>
  setEmailVerified: (verified: boolean) => void
}

/**
 * Thrown by deleteAccount when the dating-service data was deleted but the
 * auth-service record could not be removed. The user is already signed out
 * locally when this reaches the caller; both service calls tolerate 404, so
 * signing back in and re-running the flow finishes the job.
 */
export class AccountDeletionIncompleteError extends Error {
  constructor() {
    super('Profile data was deleted, but the account record could not be removed')
    this.name = 'AccountDeletionIncompleteError'
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  biometricOffer: null,

  login: async (email, password, options) => {
    try {
      const result = await apiLogin(email, password)
      await storage.setItem('access_token', result.tokens.accessToken)
      await storage.setItem('refresh_token', result.tokens.refreshToken)
      set({ user: result.user })
      audit.loginSuccess({
        userId: result.user.userId,
        tenantId: result.user.tenantId,
        sessionId: logger.sessionId,
        requestId: logger.requestId,
      })
      logger.newRequestId()

      // Remember-me bookkeeping (issue #17) — best-effort; a storage failure
      // must never fail an otherwise successful login.
      try {
        if (options?.rememberMe) {
          await biometricAuth.setRememberedEmail(email)
          // First successful password login with remember-me ON → queue the
          // "Enable Face ID sign-in?" offer if the device can honor it.
          if (!(await biometricAuth.isBiometricLoginEnabled()) &&
              !(await biometricAuth.hasDeclinedBiometricOffer())) {
            const capability = await biometricAuth.getBiometricCapability()
            if (capability.available) {
              set({ biometricOffer: { email, password, label: capability.label } })
            }
          }
        } else if (options?.rememberMe === false) {
          await biometricAuth.clearRememberedEmail()
          await biometricAuth.disableBiometricLogin()
        }
      } catch {
        // ignore — login itself succeeded
      }
    } catch (err) {
      audit.loginFailure({
        reason: err instanceof Error ? err.message : 'unknown',
        sessionId: logger.sessionId,
        requestId: logger.requestId,
      })
      throw err
    }
  },

  loginWithBiometrics: async () => {
    // Reading the Keychain-gated creds triggers the OS biometric prompt.
    const creds = await biometricAuth.getBiometricCredentials()
    if (!creds) return 'cancelled'
    try {
      await get().login(creds.email, creds.password, { rememberMe: true })
      return 'success'
    } catch {
      // Stored password no longer valid (changed server-side) — drop the
      // creds so the user isn't stuck in a biometric fail loop.
      await biometricAuth.disableBiometricLogin().catch(() => {})
      return 'failed'
    }
  },

  acceptBiometricOffer: async () => {
    const offer = get().biometricOffer
    set({ biometricOffer: null })
    if (!offer) return false
    return biometricAuth.enableBiometricLogin({ email: offer.email, password: offer.password })
  },

  declineBiometricOffer: async () => {
    set({ biometricOffer: null })
    await biometricAuth.declineBiometricOffer().catch(() => {})
  },

  socialLogin: async (provider) => {
    try {
      const credential = await getSocialCredential(provider)
      // User dismissed the native sheet — leave the screen untouched.
      if (!credential) return
      const result = await apiSocialLogin({
        provider,
        idToken: credential.idToken,
        name: credential.name,
      })
      await storage.setItem('access_token', result.tokens.accessToken)
      await storage.setItem('refresh_token', result.tokens.refreshToken)
      set({ user: result.user })
      audit.loginSuccess({
        userId: result.user.userId,
        tenantId: result.user.tenantId,
        sessionId: logger.sessionId,
        requestId: logger.requestId,
      })
      logger.newRequestId()
    } catch (err) {
      audit.loginFailure({
        reason: err instanceof Error ? `${provider}: ${err.message}` : 'unknown',
        sessionId: logger.sessionId,
        requestId: logger.requestId,
      })
      throw err
    }
  },

  register: async (email, password, name) => {
    try {
      const result = await apiRegister(email, password, name)
      await storage.setItem('access_token', result.tokens.accessToken)
      await storage.setItem('refresh_token', result.tokens.refreshToken)
      set({ user: result.user })
      audit.registerSuccess({
        userId: result.user.userId,
        tenantId: result.user.tenantId,
        sessionId: logger.sessionId,
        requestId: logger.requestId,
      })
      logger.newRequestId()
    } catch (err) {
      audit.registerFailure({
        reason: err instanceof Error ? err.message : 'unknown',
        sessionId: logger.sessionId,
        requestId: logger.requestId,
      })
      throw err
    }
  },

  logout: async () => {
    const currentUser = get().user
    await runLogoutCallback()
    audit.logout({
      userId: currentUser?.userId ?? 'unknown',
      tenantId: currentUser?.tenantId ?? 'unknown',
      sessionId: logger.sessionId,
      requestId: logger.requestId,
    })
    logger.clearContext()
    logger.newRequestId()
    await storage.deleteItem('access_token')
    await storage.deleteItem('refresh_token')
    // Sign-out revokes biometric sign-in (issue #17); the remembered email
    // survives on purpose — it only prefills the form.
    await biometricAuth.disableBiometricLogin().catch(() => {})
    set({ user: null, biometricOffer: null })
  },

  /**
   * In-app account deletion (issue #18, Apple 5.1.1(v)).
   *
   * Order matters: dating-service data first, then the auth record (which
   * revokes tokens — so it must go last, and before local tokens are
   * cleared). Both API calls treat 404 as success, so the whole flow is safe
   * to re-run after a partial failure.
   */
  deleteAccount: async () => {
    const currentUser = get().user

    // 1. Dating-service cascade: profile, photos, swipes, matches, messages,
    //    device tokens. Failure here leaves the session intact — plain retry.
    await apiDeleteAccountData()

    // 2. Auth-service record + token revocation.
    try {
      await apiDeleteAuthAccount()
    } catch {
      // Dating data is gone but the login still exists. Sign out locally
      // anyway (the account is unusable) and let the caller surface a
      // retryable error state.
      await get().logout()
      throw new AccountDeletionIncompleteError()
    }

    audit.log('account_deleted', {
      userId: currentUser?.userId ?? 'unknown',
      tenantId: currentUser?.tenantId ?? 'unknown',
      sessionId: logger.sessionId,
      requestId: logger.requestId,
    })

    // 3. Clear the local session (tokens, push registration, logger context).
    await get().logout()
  },

  sessionExpired: () => {
    audit.sessionExpired({
      sessionId: logger.sessionId,
      requestId: logger.requestId,
      userId: get().user?.userId,
    })
    logger.clearContext()
    logger.newRequestId()
    set({ user: null })
  },

  setEmailVerified: (verified) =>
    set((state) => (state.user ? { user: { ...state.user, emailVerified: verified } } : state)),

  hydrate: async () => {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
    try {
      const token = await Promise.race([storage.getItem('access_token'), timeout])
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          set({ user: {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            tenantId: payload.tenantId,
            // Optional — tokens signed before this field existed will leave
            // it undefined; the banner UI treats that as "don't nag yet."
            emailVerified: payload.emailVerified,
          } })
        } else {
          await Promise.all([
            storage.deleteItem('access_token'),
            storage.deleteItem('refresh_token'),
          ])
        }
      }
    } catch {
      await Promise.all([
        storage.deleteItem('access_token').catch(() => {}),
        storage.deleteItem('refresh_token').catch(() => {}),
      ])
    }
    set({ isLoading: false })
  },
}))
