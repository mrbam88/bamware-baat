import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { authClient } from '../../../src/api/client'
import { deleteAccount, login, register, forgotPassword, requestEmailVerification, socialLogin } from '../../../src/api/auth'

const mock = new MockAdapter(authClient)

afterEach(() => mock.reset())

const MOCK_RESPONSE = {
  tokens: { accessToken: 'access-tok', refreshToken: 'refresh-tok' },
  user: { userId: 'u1', email: 'a@b.com', name: 'Ali', role: 'user', tenantId: 'baat' },
}

describe('auth API', () => {
  it('calls /auth/login with email, password, and tenantId', async () => {
    mock.onPost('/auth/login').reply(200, MOCK_RESPONSE)
    const result = await login('a@b.com', 'secret')
    expect(result.tokens.accessToken).toBe('access-tok')
    expect(result.user.userId).toBe('u1')
    const body = JSON.parse(mock.history.post[0].data)
    expect(body.tenantId).toBe('baat')
  })

  it('throws on 401', async () => {
    mock.onPost('/auth/login').reply(401)
    await expect(login('a@b.com', 'wrong')).rejects.toThrow()
  })

  it('throws on network error', async () => {
    mock.onPost('/auth/login').networkError()
    await expect(login('a@b.com', 'secret')).rejects.toThrow()
  })

  it('calls /auth/register with email, password, name, and tenantId', async () => {
    mock.onPost('/auth/register').reply(201, MOCK_RESPONSE)
    const result = await register('a@b.com', 'secret123', 'Ali')
    expect(result.tokens.accessToken).toBe('access-tok')
    expect(result.user.userId).toBe('u1')
    const body = JSON.parse(mock.history.post[0].data)
    expect(body).toEqual({ email: 'a@b.com', password: 'secret123', name: 'Ali', tenantId: 'baat' })
  })

  it('register throws on 409 (email taken)', async () => {
    mock.onPost('/auth/register').reply(409, { error: 'Email already registered' })
    await expect(register('a@b.com', 'secret123', 'Ali')).rejects.toThrow()
  })

  it('forgotPassword posts email + tenantId and resolves on 200', async () => {
    mock.onPost('/auth/forgot-password').reply(200, { ok: true })
    await forgotPassword('a@b.com')
    const body = JSON.parse(mock.history.post[0].data)
    expect(body).toEqual({ email: 'a@b.com', tenantId: 'baat' })
  })

  it('requestEmailVerification sends a bearer token from storage', async () => {
    const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
    SecureStore.getItemAsync.mockResolvedValue('an.access.tok')
    mock.onPost('/auth/verify-email/request').reply(200, { ok: true })
    await requestEmailVerification()
    expect(mock.history.post[0].headers?.Authorization).toBe('Bearer an.access.tok')
  })

  it('requestEmailVerification throws when no token is stored', async () => {
    const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
    SecureStore.getItemAsync.mockResolvedValue(null)
    await expect(requestEmailVerification()).rejects.toThrow('Not authenticated')
  })

  // --- socialLogin (issue #20; contract: bamware-auth-service#2) ---

  it('socialLogin posts provider, idToken, name, and tenantId to /auth/social', async () => {
    mock.onPost('/auth/social').reply(200, MOCK_RESPONSE)
    const result = await socialLogin({ provider: 'apple', idToken: 'apple.id.tok', name: 'Ali Khan' })
    expect(result.tokens.accessToken).toBe('access-tok')
    expect(result.user.userId).toBe('u1')
    const body = JSON.parse(mock.history.post[0].data)
    expect(body).toEqual({
      provider: 'apple',
      idToken: 'apple.id.tok',
      name: 'Ali Khan',
      tenantId: 'baat',
    })
  })

  it('socialLogin omits name when not provided (Apple after first auth, Google)', async () => {
    mock.onPost('/auth/social').reply(200, MOCK_RESPONSE)
    await socialLogin({ provider: 'google', idToken: 'google.id.tok' })
    const body = JSON.parse(mock.history.post[0].data)
    expect(body).toEqual({
      provider: 'google',
      idToken: 'google.id.tok',
      tenantId: 'baat',
    })
  })

  it('socialLogin throws on 401 (backend rejected the identity token)', async () => {
    mock.onPost('/auth/social').reply(401, { error: 'Invalid token' })
    await expect(socialLogin({ provider: 'google', idToken: 'bad' })).rejects.toThrow()
  })

  describe('deleteAccount', () => {
    // Contract: bamware-auth-service DELETE /auth/account → 200 {ok:true} (issue #18).
    it('DELETEs /auth/account with a bearer token from storage', async () => {
      const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
      SecureStore.getItemAsync.mockResolvedValue('an.access.tok')
      mock.onDelete('/auth/account').reply(200, { ok: true })
      await expect(deleteAccount()).resolves.toBeUndefined()
      expect(mock.history.delete[0].headers?.Authorization).toBe('Bearer an.access.tok')
    })

    it('treats 404 as success (idempotent re-run after partial failure)', async () => {
      const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
      SecureStore.getItemAsync.mockResolvedValue('an.access.tok')
      mock.onDelete('/auth/account').reply(404, { error: 'Not found' })
      await expect(deleteAccount()).resolves.toBeUndefined()
    })

    it('throws when no token is stored', async () => {
      const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
      SecureStore.getItemAsync.mockResolvedValue(null)
      await expect(deleteAccount()).rejects.toThrow('Not authenticated')
    })

    it('throws on server error so the caller can surface the partial-failure state', async () => {
      const SecureStore = jest.requireMock('expo-secure-store') as { getItemAsync: jest.Mock }
      SecureStore.getItemAsync.mockResolvedValue('an.access.tok')
      mock.onDelete('/auth/account').reply(503)
      await expect(deleteAccount()).rejects.toThrow()
    })
  })
})
