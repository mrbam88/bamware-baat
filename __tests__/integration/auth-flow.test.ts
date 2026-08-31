/**
 * Integration: full auth lifecycle
 * Login → tokens persisted → hydrate restores session → logout clears everything
 */
import * as SecureStore from 'expo-secure-store'
import MockAdapter from 'axios-mock-adapter'
import { authClient } from '../../src/api/client'
import { useAuthStore } from '../../src/store/authStore'

jest.mock('../../src/lib/audit', () => ({
  audit: { loginSuccess: jest.fn(), loginFailure: jest.fn(), logout: jest.fn() },
}))
jest.mock('../../src/lib/logger', () => ({
  logger: { setContext: jest.fn(), clearContext: jest.fn(), newRequestId: jest.fn(), sessionId: 's', requestId: 'r' },
}))

const httpMock = new MockAdapter(authClient)
const mockGet = SecureStore.getItemAsync as jest.Mock
const mockSet = SecureStore.setItemAsync as jest.Mock
const mockDelete = SecureStore.deleteItemAsync as jest.Mock

function resetStore() {
  useAuthStore.setState({ user: null, isLoading: true })
}

beforeEach(() => {
  jest.clearAllMocks()
  resetStore()
  httpMock.reset()
})

afterAll(() => httpMock.restore())

describe('auth flow', () => {
  it('login → hydrate → logout completes without error', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const payload = { userId: 'u1', email: 'a@b.com', name: 'Ali', tenantId: 'baat', exp }
    const accessToken = `h.${btoa(JSON.stringify(payload))}.sig`

    // 1. Login
    httpMock.onPost('/auth/login').reply(200, {
      tokens: { accessToken, refreshToken: 'refresh-tok' },
      user: { userId: 'u1', email: 'a@b.com', name: 'Ali', role: 'user', tenantId: 'baat' },
    })
    await useAuthStore.getState().login('a@b.com', 'secret')
    expect(useAuthStore.getState().user?.userId).toBe('u1')

    // 2. Simulate app restart — hydrate from stored token
    resetStore()
    mockGet.mockResolvedValue(accessToken)
    await useAuthStore.getState().hydrate()
    expect(useAuthStore.getState().user?.userId).toBe('u1')
    expect(useAuthStore.getState().isLoading).toBe(false)

    // 3. Logout
    mockDelete.mockResolvedValue(undefined)
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(mockDelete).toHaveBeenCalledWith('access_token')
    expect(mockDelete).toHaveBeenCalledWith('refresh_token')
  })

  it('hydrate on fresh install leaves user null and isLoading false', async () => {
    mockGet.mockResolvedValue(null)
    await useAuthStore.getState().hydrate()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('failed login does not corrupt store state', async () => {
    httpMock.onPost('/auth/login').reply(401)
    await expect(useAuthStore.getState().login('a@b.com', 'bad')).rejects.toThrow()
    expect(useAuthStore.getState().user).toBeNull()
    expect(mockSet).not.toHaveBeenCalled()
  })
})
