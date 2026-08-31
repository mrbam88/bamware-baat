import * as SecureStore from 'expo-secure-store'
import { AccountDeletionIncompleteError, useAuthStore } from '../../../src/store/authStore'

jest.mock('../../../src/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  socialLogin: jest.fn(),
  deleteAccount: jest.fn(),
}))
jest.mock('../../../src/lib/socialAuth', () => ({
  getSocialCredential: jest.fn(),
}))
jest.mock('../../../src/api/profile', () => ({
  deleteMyAccountData: jest.fn(),
}))
jest.mock('../../../src/lib/audit', () => ({
  audit: {
    loginSuccess: jest.fn(), loginFailure: jest.fn(),
    registerSuccess: jest.fn(), registerFailure: jest.fn(),
    logout: jest.fn(), log: jest.fn(),
  },
}))
jest.mock('../../../src/lib/logger', () => ({
  logger: { setContext: jest.fn(), clearContext: jest.fn(), newRequestId: jest.fn(), sessionId: 's', requestId: 'r' },
}))

import {
  login as apiLogin,
  register as apiRegister,
  socialLogin as apiSocialLogin,
  deleteAccount as apiDeleteAuthAccount,
} from '../../../src/api/auth'
import { getSocialCredential } from '../../../src/lib/socialAuth'
import { deleteMyAccountData as apiDeleteAccountData } from '../../../src/api/profile'
import { audit } from '../../../src/lib/audit'

const mockLogin = apiLogin as jest.Mock
const mockRegister = apiRegister as jest.Mock
const mockApiSocialLogin = apiSocialLogin as jest.Mock
const mockGetSocialCredential = getSocialCredential as jest.Mock
const mockDeleteAuthAccount = apiDeleteAuthAccount as jest.Mock
const mockDeleteAccountData = apiDeleteAccountData as jest.Mock
const mockGet = SecureStore.getItemAsync as jest.Mock
const mockSet = SecureStore.setItemAsync as jest.Mock
const mockDelete = SecureStore.deleteItemAsync as jest.Mock

function resetStore() {
  useAuthStore.setState({ user: null, isLoading: true })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetStore()
})

const MOCK_USER = { userId: 'u1', email: 'a@b.com', name: 'Ali', tenantId: 'baat' }
const MOCK_TOKENS = { accessToken: 'access-tok', refreshToken: 'refresh-tok' }

describe('authStore', () => {
  describe('hydrate', () => {
    it('sets isLoading false when no token stored', async () => {
      mockGet.mockResolvedValue(null)
      await useAuthStore.getState().hydrate()
      expect(useAuthStore.getState().isLoading).toBe(false)
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('restores user from a valid token', async () => {
      const payload = { userId: 'u1', email: 'a@b.com', name: 'Ali', tenantId: 't1', exp: Math.floor(Date.now() / 1000) + 3600 }
      const token = `header.${btoa(JSON.stringify(payload))}.sig`
      mockGet.mockResolvedValue(token)
      await useAuthStore.getState().hydrate()
      expect(useAuthStore.getState().user?.userId).toBe('u1')
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('clears an expired token and leaves user null', async () => {
      const payload = { userId: 'u1', email: 'a@b.com', name: 'Ali', tenantId: 't1', exp: Math.floor(Date.now() / 1000) - 1 }
      const token = `header.${btoa(JSON.stringify(payload))}.sig`
      mockGet.mockResolvedValue(token)
      await useAuthStore.getState().hydrate()
      expect(useAuthStore.getState().user).toBeNull()
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('stores tokens and sets user on success', async () => {
      mockLogin.mockResolvedValue({ tokens: MOCK_TOKENS, user: { ...MOCK_USER, role: 'user' } })
      await useAuthStore.getState().login('a@b.com', 'secret')
      expect(mockSet).toHaveBeenCalledWith('access_token', 'access-tok')
      expect(mockSet).toHaveBeenCalledWith('refresh_token', 'refresh-tok')
      expect(useAuthStore.getState().user?.userId).toBe('u1')
    })

    it('throws and does not set user on API failure', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'))
      await expect(useAuthStore.getState().login('a@b.com', 'wrong')).rejects.toThrow()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('register', () => {
    it('stores tokens and sets user on success', async () => {
      mockRegister.mockResolvedValue({ tokens: MOCK_TOKENS, user: { ...MOCK_USER, role: 'customer' } })
      await useAuthStore.getState().register('a@b.com', 'secret123', 'Ali')
      expect(mockRegister).toHaveBeenCalledWith('a@b.com', 'secret123', 'Ali')
      expect(mockSet).toHaveBeenCalledWith('access_token', 'access-tok')
      expect(mockSet).toHaveBeenCalledWith('refresh_token', 'refresh-tok')
      expect(useAuthStore.getState().user?.userId).toBe('u1')
    })

    it('throws and does not set user on API failure', async () => {
      mockRegister.mockRejectedValue(new Error('Email already registered'))
      await expect(
        useAuthStore.getState().register('a@b.com', 'secret123', 'Ali'),
      ).rejects.toThrow()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('socialLogin', () => {
    it('runs the native flow, exchanges the idToken, and persists tokens like login', async () => {
      mockGetSocialCredential.mockResolvedValue({ idToken: 'apple.id.tok', name: 'Ali Khan' })
      mockApiSocialLogin.mockResolvedValue({ tokens: MOCK_TOKENS, user: { ...MOCK_USER, role: 'user' } })

      await useAuthStore.getState().socialLogin('apple')

      expect(mockGetSocialCredential).toHaveBeenCalledWith('apple')
      expect(mockApiSocialLogin).toHaveBeenCalledWith({
        provider: 'apple',
        idToken: 'apple.id.tok',
        name: 'Ali Khan',
      })
      expect(mockSet).toHaveBeenCalledWith('access_token', 'access-tok')
      expect(mockSet).toHaveBeenCalledWith('refresh_token', 'refresh-tok')
      expect(useAuthStore.getState().user?.userId).toBe('u1')
    })

    it('passes name as undefined when the provider shares none (Google / Apple re-auth)', async () => {
      mockGetSocialCredential.mockResolvedValue({ idToken: 'google.id.tok' })
      mockApiSocialLogin.mockResolvedValue({ tokens: MOCK_TOKENS, user: { ...MOCK_USER, role: 'user' } })

      await useAuthStore.getState().socialLogin('google')

      expect(mockApiSocialLogin).toHaveBeenCalledWith({
        provider: 'google',
        idToken: 'google.id.tok',
        name: undefined,
      })
      expect(useAuthStore.getState().user?.userId).toBe('u1')
    })

    it('is a silent no-op when the user cancels the native sheet', async () => {
      mockGetSocialCredential.mockResolvedValue(null)

      await expect(useAuthStore.getState().socialLogin('google')).resolves.toBeUndefined()

      expect(mockApiSocialLogin).not.toHaveBeenCalled()
      expect(mockSet).not.toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBeNull()
    })

    it('throws and does not set user when the API rejects the token', async () => {
      mockGetSocialCredential.mockResolvedValue({ idToken: 'bad.tok' })
      mockApiSocialLogin.mockRejectedValue(new Error('Invalid token'))

      await expect(useAuthStore.getState().socialLogin('google')).rejects.toThrow('Invalid token')
      expect(useAuthStore.getState().user).toBeNull()
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('propagates native-flow failures (e.g. Google not configured yet)', async () => {
      mockGetSocialCredential.mockRejectedValue(new Error("Google Sign-In isn't available yet"))

      await expect(useAuthStore.getState().socialLogin('google')).rejects.toThrow("isn't available")
      expect(mockApiSocialLogin).not.toHaveBeenCalled()
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('logout', () => {
    it('clears tokens and nulls user', async () => {
      useAuthStore.setState({ user: MOCK_USER, isLoading: false })
      mockDelete.mockResolvedValue(undefined)
      await useAuthStore.getState().logout()
      expect(mockDelete).toHaveBeenCalledWith('access_token')
      expect(mockDelete).toHaveBeenCalledWith('refresh_token')
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  describe('deleteAccount', () => {
    beforeEach(() => {
      useAuthStore.setState({ user: MOCK_USER, isLoading: false })
      mockDelete.mockResolvedValue(undefined)
    })

    it('deletes dating data, then the auth account, then clears the session', async () => {
      const order: string[] = []
      mockDeleteAccountData.mockImplementation(async () => { order.push('dating') })
      mockDeleteAuthAccount.mockImplementation(async () => { order.push('auth') })

      await useAuthStore.getState().deleteAccount()

      // Dating-service cascade must run before the auth record is removed
      // (deleting auth revokes the token the dating call needs).
      expect(order).toEqual(['dating', 'auth'])
      expect(mockDelete).toHaveBeenCalledWith('access_token')
      expect(mockDelete).toHaveBeenCalledWith('refresh_token')
      expect(useAuthStore.getState().user).toBeNull()
      expect((audit as any).log).toHaveBeenCalledWith(
        'account_deleted',
        expect.objectContaining({ userId: 'u1', tenantId: 'baat' }),
      )
    })

    it('partial failure (dating deleted, auth fails): signs out locally and throws a retryable error', async () => {
      mockDeleteAccountData.mockResolvedValue(undefined)
      mockDeleteAuthAccount.mockRejectedValue(new Error('503'))

      await expect(useAuthStore.getState().deleteAccount()).rejects.toBeInstanceOf(
        AccountDeletionIncompleteError,
      )

      // Signed out locally even though the auth record survived.
      expect(mockDelete).toHaveBeenCalledWith('access_token')
      expect(mockDelete).toHaveBeenCalledWith('refresh_token')
      expect(useAuthStore.getState().user).toBeNull()
      expect((audit as any).log).not.toHaveBeenCalled()
    })

    it('keeps the session when the dating-service call fails (plain retry possible)', async () => {
      mockDeleteAccountData.mockRejectedValue(new Error('500'))

      await expect(useAuthStore.getState().deleteAccount()).rejects.toThrow('500')

      expect(mockDeleteAuthAccount).not.toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
      expect(useAuthStore.getState().user?.userId).toBe('u1')
    })
  })
})
