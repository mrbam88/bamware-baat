/**
 * authStore remember-me + biometric sign-in logic (issue #17).
 *
 * Lives in its own file (rather than authStore.test.ts) so it composes
 * cleanly with the SSO work landing in the same store (issue #20 / PR #21).
 * The biometricAuth lib is fully mocked — its own behavior is covered by
 * __tests__/unit/lib/biometricAuth.test.ts.
 */
import { useAuthStore } from '../../../src/store/authStore'

jest.mock('../../../src/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
}))
jest.mock('../../../src/lib/audit', () => ({
  audit: {
    loginSuccess: jest.fn(), loginFailure: jest.fn(),
    registerSuccess: jest.fn(), registerFailure: jest.fn(),
    logout: jest.fn(), sessionExpired: jest.fn(),
  },
}))
jest.mock('../../../src/lib/logger', () => ({
  logger: { setContext: jest.fn(), clearContext: jest.fn(), newRequestId: jest.fn(), sessionId: 's', requestId: 'r' },
}))
jest.mock('../../../src/lib/notifications', () => ({
  runLogoutCallback: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../../../src/lib/biometricAuth', () => ({
  getBiometricCapability: jest.fn().mockResolvedValue({ available: false, label: 'Biometrics' }),
  getRememberedEmail: jest.fn().mockResolvedValue(null),
  setRememberedEmail: jest.fn().mockResolvedValue(undefined),
  clearRememberedEmail: jest.fn().mockResolvedValue(undefined),
  isBiometricLoginEnabled: jest.fn().mockResolvedValue(false),
  hasDeclinedBiometricOffer: jest.fn().mockResolvedValue(false),
  declineBiometricOffer: jest.fn().mockResolvedValue(undefined),
  enableBiometricLogin: jest.fn().mockResolvedValue(true),
  disableBiometricLogin: jest.fn().mockResolvedValue(undefined),
  getBiometricCredentials: jest.fn().mockResolvedValue(null),
}))

import { login as apiLogin } from '../../../src/api/auth'
import * as biometricAuth from '../../../src/lib/biometricAuth'

const mockApiLogin = apiLogin as jest.Mock
const lib = biometricAuth as jest.Mocked<typeof biometricAuth>

const MOCK_USER = { userId: 'u1', email: 'a@b.com', name: 'Ali', tenantId: 'baat' }
const MOCK_TOKENS = { accessToken: 'access-tok', refreshToken: 'refresh-tok' }
const CREDS = { email: 'a@b.com', password: 'hunter22' }

beforeEach(() => {
  jest.clearAllMocks()
  // restore defaults clobbered by clearAllMocks
  lib.getBiometricCapability.mockResolvedValue({ available: false, label: 'Biometrics' })
  lib.isBiometricLoginEnabled.mockResolvedValue(false)
  lib.hasDeclinedBiometricOffer.mockResolvedValue(false)
  lib.enableBiometricLogin.mockResolvedValue(true)
  lib.getBiometricCredentials.mockResolvedValue(null)
  useAuthStore.setState({ user: null, isLoading: true, biometricOffer: null })
  mockApiLogin.mockResolvedValue({ tokens: MOCK_TOKENS, user: MOCK_USER })
})

describe('login remember-me bookkeeping', () => {
  it('persists the email when rememberMe is ON', async () => {
    await useAuthStore.getState().login('a@b.com', 'pw', { rememberMe: true })
    expect(lib.setRememberedEmail).toHaveBeenCalledWith('a@b.com')
    expect(lib.clearRememberedEmail).not.toHaveBeenCalled()
  })

  it('clears the email AND stored creds when rememberMe is OFF', async () => {
    await useAuthStore.getState().login('a@b.com', 'pw', { rememberMe: false })
    expect(lib.clearRememberedEmail).toHaveBeenCalled()
    expect(lib.disableBiometricLogin).toHaveBeenCalled()
    expect(lib.setRememberedEmail).not.toHaveBeenCalled()
  })

  it('touches no remember-me state when options are omitted (legacy callers)', async () => {
    await useAuthStore.getState().login('a@b.com', 'pw')
    expect(lib.setRememberedEmail).not.toHaveBeenCalled()
    expect(lib.clearRememberedEmail).not.toHaveBeenCalled()
  })

  it('does not remember the email when the API rejects', async () => {
    mockApiLogin.mockRejectedValue(new Error('bad creds'))
    await expect(useAuthStore.getState().login('a@b.com', 'pw', { rememberMe: true })).rejects.toThrow()
    expect(lib.setRememberedEmail).not.toHaveBeenCalled()
  })
})

describe('biometric enrollment offer', () => {
  it('queues the offer after password login with rememberMe ON on capable hardware', async () => {
    lib.getBiometricCapability.mockResolvedValue({ available: true, label: 'Face ID' })
    await useAuthStore.getState().login('a@b.com', 'hunter22', { rememberMe: true })
    expect(useAuthStore.getState().biometricOffer).toEqual({
      email: 'a@b.com', password: 'hunter22', label: 'Face ID',
    })
  })

  it.each([
    ['hardware unavailable', () => lib.getBiometricCapability.mockResolvedValue({ available: false, label: 'Biometrics' })],
    ['already enabled', () => {
      lib.getBiometricCapability.mockResolvedValue({ available: true, label: 'Face ID' })
      lib.isBiometricLoginEnabled.mockResolvedValue(true)
    }],
    ['previously declined', () => {
      lib.getBiometricCapability.mockResolvedValue({ available: true, label: 'Face ID' })
      lib.hasDeclinedBiometricOffer.mockResolvedValue(true)
    }],
  ])('makes no offer when %s', async (_case, arrange) => {
    arrange()
    await useAuthStore.getState().login('a@b.com', 'hunter22', { rememberMe: true })
    expect(useAuthStore.getState().biometricOffer).toBeNull()
  })

  it('makes no offer when rememberMe is OFF', async () => {
    lib.getBiometricCapability.mockResolvedValue({ available: true, label: 'Face ID' })
    await useAuthStore.getState().login('a@b.com', 'hunter22', { rememberMe: false })
    expect(useAuthStore.getState().biometricOffer).toBeNull()
  })

  it('acceptBiometricOffer stores the creds and clears the offer', async () => {
    useAuthStore.setState({ biometricOffer: { ...CREDS, label: 'Face ID' } })
    expect(await useAuthStore.getState().acceptBiometricOffer()).toBe(true)
    expect(lib.enableBiometricLogin).toHaveBeenCalledWith(CREDS)
    expect(useAuthStore.getState().biometricOffer).toBeNull()
  })

  it('declineBiometricOffer persists the decline and clears the offer', async () => {
    useAuthStore.setState({ biometricOffer: { ...CREDS, label: 'Face ID' } })
    await useAuthStore.getState().declineBiometricOffer()
    expect(lib.declineBiometricOffer).toHaveBeenCalled()
    expect(lib.enableBiometricLogin).not.toHaveBeenCalled()
    expect(useAuthStore.getState().biometricOffer).toBeNull()
  })
})

describe('loginWithBiometrics', () => {
  it('logs in with the Keychain-gated creds and signs the user in', async () => {
    lib.getBiometricCredentials.mockResolvedValue(CREDS)
    const result = await useAuthStore.getState().loginWithBiometrics()
    expect(result).toBe('success')
    expect(mockApiLogin).toHaveBeenCalledWith('a@b.com', 'hunter22')
    expect(useAuthStore.getState().user?.userId).toBe('u1')
  })

  it('returns cancelled without hitting the API when the gate is not passed', async () => {
    lib.getBiometricCredentials.mockResolvedValue(null)
    expect(await useAuthStore.getState().loginWithBiometrics()).toBe('cancelled')
    expect(mockApiLogin).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('returns failed and wipes stored creds when the API rejects them', async () => {
    lib.getBiometricCredentials.mockResolvedValue(CREDS)
    mockApiLogin.mockRejectedValue(new Error('password changed'))
    expect(await useAuthStore.getState().loginWithBiometrics()).toBe('failed')
    expect(lib.disableBiometricLogin).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe('logout', () => {
  it('revokes biometric sign-in but keeps the remembered email', async () => {
    useAuthStore.setState({ user: MOCK_USER, isLoading: false })
    await useAuthStore.getState().logout()
    expect(lib.disableBiometricLogin).toHaveBeenCalled()
    expect(lib.clearRememberedEmail).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
