/**
 * biometricAuth lib tests (issue #17).
 *
 * expo-secure-store and expo-local-authentication are mocked in the shared
 * setup.ts; here the secure-store mock is given an in-memory backing map so
 * multi-step flows (enable → read → fail → lockout) exercise real state.
 */
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import {
  BIOMETRIC_ATTEMPTS_KEY,
  BIOMETRIC_CREDS_KEY,
  BIOMETRIC_DECLINED_KEY,
  BIOMETRIC_ENABLED_KEY,
  MAX_BIOMETRIC_ATTEMPTS,
  REMEMBERED_EMAIL_KEY,
  clearRememberedEmail,
  declineBiometricOffer,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricCapability,
  getBiometricCredentials,
  getRememberedEmail,
  hasDeclinedBiometricOffer,
  isBiometricLoginEnabled,
  setRememberedEmail,
} from '../../../src/lib/biometricAuth'

const mockGet = SecureStore.getItemAsync as jest.Mock
const mockSet = SecureStore.setItemAsync as jest.Mock
const mockDelete = SecureStore.deleteItemAsync as jest.Mock
const mockHasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock
const mockEnrolled = LocalAuthentication.isEnrolledAsync as jest.Mock
const mockTypes = LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock

/** In-memory keychain double. */
let vault: Map<string, string>

beforeEach(() => {
  jest.clearAllMocks()
  vault = new Map()
  mockGet.mockImplementation(async (key: string) => vault.get(key) ?? null)
  mockSet.mockImplementation(async (key: string, value: string) => { vault.set(key, value) })
  mockDelete.mockImplementation(async (key: string) => { vault.delete(key) })
  mockHasHardware.mockResolvedValue(true)
  mockEnrolled.mockResolvedValue(true)
  mockTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION])
})

const CREDS = { email: 'a@b.com', password: 'hunter22' }

describe('getBiometricCapability', () => {
  it('is unavailable without hardware', async () => {
    mockHasHardware.mockResolvedValue(false)
    expect((await getBiometricCapability()).available).toBe(false)
  })

  it('is unavailable when no biometrics are enrolled', async () => {
    mockEnrolled.mockResolvedValue(false)
    expect((await getBiometricCapability()).available).toBe(false)
  })

  it('labels facial recognition as Face ID on iOS', async () => {
    expect(await getBiometricCapability()).toEqual({ available: true, label: 'Face ID' })
  })

  it('labels fingerprint as Touch ID on iOS', async () => {
    mockTypes.mockResolvedValue([LocalAuthentication.AuthenticationType.FINGERPRINT])
    expect(await getBiometricCapability()).toEqual({ available: true, label: 'Touch ID' })
  })
})

describe('remembered email', () => {
  it('round-trips and clears', async () => {
    await setRememberedEmail('a@b.com')
    expect(await getRememberedEmail()).toBe('a@b.com')
    expect(vault.has(REMEMBERED_EMAIL_KEY)).toBe(true)
    await clearRememberedEmail()
    expect(await getRememberedEmail()).toBeNull()
  })
})

describe('enableBiometricLogin', () => {
  it('stores creds behind the biometric gate and flips the enabled flag', async () => {
    expect(await enableBiometricLogin(CREDS)).toBe(true)
    const credsCall = mockSet.mock.calls.find(([key]) => key === BIOMETRIC_CREDS_KEY)!
    expect(JSON.parse(credsCall[1])).toEqual(CREDS)
    expect(credsCall[2]).toMatchObject({ requireAuthentication: true })
    expect(await isBiometricLoginEnabled()).toBe(true)
    expect(vault.has(BIOMETRIC_DECLINED_KEY)).toBe(false)
  })

  it('returns false and does not enable when the keychain write is rejected', async () => {
    mockSet.mockImplementation(async (key: string) => {
      if (key === BIOMETRIC_CREDS_KEY) throw new Error('no passcode set')
    })
    expect(await enableBiometricLogin(CREDS)).toBe(false)
    expect(await isBiometricLoginEnabled()).toBe(false)
  })
})

describe('getBiometricCredentials', () => {
  it('returns parsed creds and resets the failure counter on success', async () => {
    await enableBiometricLogin(CREDS)
    vault.set(BIOMETRIC_ATTEMPTS_KEY, '2')
    expect(await getBiometricCredentials()).toEqual(CREDS)
    expect(vault.has(BIOMETRIC_ATTEMPTS_KEY)).toBe(false)
  })

  it('returns null and counts an attempt when the biometric check fails', async () => {
    await enableBiometricLogin(CREDS)
    mockGet.mockImplementation(async (key: string) => {
      if (key === BIOMETRIC_CREDS_KEY) throw new Error('user cancelled')
      return vault.get(key) ?? null
    })
    expect(await getBiometricCredentials()).toBeNull()
    expect(vault.get(BIOMETRIC_ATTEMPTS_KEY)).toBe('1')
    expect(await isBiometricLoginEnabled()).toBe(true)
  })

  it(`wipes stored creds after ${MAX_BIOMETRIC_ATTEMPTS} consecutive failures`, async () => {
    await enableBiometricLogin(CREDS)
    mockGet.mockImplementation(async (key: string) => {
      if (key === BIOMETRIC_CREDS_KEY) throw new Error('face not recognized')
      return vault.get(key) ?? null
    })
    for (let i = 0; i < MAX_BIOMETRIC_ATTEMPTS; i++) {
      expect(await getBiometricCredentials()).toBeNull()
    }
    expect(mockDelete).toHaveBeenCalledWith(BIOMETRIC_CREDS_KEY)
    expect(vault.has(BIOMETRIC_ENABLED_KEY)).toBe(false)
    expect(vault.has(BIOMETRIC_ATTEMPTS_KEY)).toBe(false)
  })

  it('drops a stale enabled flag when the keychain item vanished', async () => {
    vault.set(BIOMETRIC_ENABLED_KEY, '1') // flag set, but no creds (OS reset)
    expect(await getBiometricCredentials()).toBeNull()
    expect(await isBiometricLoginEnabled()).toBe(false)
  })
})

describe('disableBiometricLogin', () => {
  it('removes creds, enabled flag, and attempt counter', async () => {
    await enableBiometricLogin(CREDS)
    vault.set(BIOMETRIC_ATTEMPTS_KEY, '1')
    await disableBiometricLogin()
    expect(vault.has(BIOMETRIC_CREDS_KEY)).toBe(false)
    expect(vault.has(BIOMETRIC_ENABLED_KEY)).toBe(false)
    expect(vault.has(BIOMETRIC_ATTEMPTS_KEY)).toBe(false)
  })
})

describe('offer decline persistence', () => {
  it('remembers that the user said no', async () => {
    expect(await hasDeclinedBiometricOffer()).toBe(false)
    await declineBiometricOffer()
    expect(await hasDeclinedBiometricOffer()).toBe(true)
  })

  it('is reset by a later enrollment', async () => {
    await declineBiometricOffer()
    await enableBiometricLogin(CREDS)
    expect(await hasDeclinedBiometricOffer()).toBe(false)
  })
})
