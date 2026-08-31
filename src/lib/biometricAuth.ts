/**
 * Login QoL storage + biometric gate (issue #17).
 *
 * Two tiers of persistence:
 *  - Remembered email → plain secure store (web-safe via lib/storage). Low
 *    sensitivity; used only to prefill the login form.
 *  - Full credentials for biometric sign-in → Keychain/Keystore item written
 *    with `requireAuthentication: true`, so the OS refuses to release it
 *    without a fresh Face ID / Touch ID / fingerprint check. Reading the item
 *    IS the biometric prompt — no separate authenticateAsync round-trip, so
 *    there is no window where the creds are readable un-gated.
 *
 * expo-local-authentication is used for capability detection only (hardware
 * present + biometrics enrolled + naming the modality for UI copy).
 */
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import * as storage from './storage'

export const REMEMBERED_EMAIL_KEY = 'remembered_email'
export const BIOMETRIC_CREDS_KEY = 'biometric_credentials'
export const BIOMETRIC_ENABLED_KEY = 'biometric_login_enabled'
export const BIOMETRIC_ATTEMPTS_KEY = 'biometric_failed_attempts'
export const BIOMETRIC_DECLINED_KEY = 'biometric_offer_declined'

/** After this many consecutive failed/cancelled biometric reads, stored creds are wiped. */
export const MAX_BIOMETRIC_ATTEMPTS = 3

export interface BiometricCredentials {
  email: string
  password: string
}

export interface BiometricCapability {
  available: boolean
  /** Human label for UI copy: "Face ID", "Touch ID", "Biometrics", … */
  label: string
}

const isWeb = () => Platform.OS === 'web'

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (isWeb()) return { available: false, label: 'Biometrics' }
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
    if (!hasHardware || !enrolled) return { available: false, label: 'Biometrics' }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    let label = 'Biometrics'
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = Platform.OS === 'ios' ? 'Face ID' : 'Face unlock'
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint'
    }
    return { available: true, label }
  } catch {
    return { available: false, label: 'Biometrics' }
  }
}

// --- Remembered email (remember-me checkbox) ---

export function getRememberedEmail(): Promise<string | null> {
  return storage.getItem(REMEMBERED_EMAIL_KEY)
}

export function setRememberedEmail(email: string): Promise<void> {
  return storage.setItem(REMEMBERED_EMAIL_KEY, email)
}

export function clearRememberedEmail(): Promise<void> {
  return storage.deleteItem(REMEMBERED_EMAIL_KEY)
}

// --- Biometric enrollment state ---

export async function isBiometricLoginEnabled(): Promise<boolean> {
  return (await storage.getItem(BIOMETRIC_ENABLED_KEY)) === '1'
}

export async function hasDeclinedBiometricOffer(): Promise<boolean> {
  return (await storage.getItem(BIOMETRIC_DECLINED_KEY)) === '1'
}

/** Persist "asked and said no" so the enable modal doesn't nag on every login. */
export function declineBiometricOffer(): Promise<void> {
  return storage.setItem(BIOMETRIC_DECLINED_KEY, '1')
}

// --- Keychain-gated credentials ---

/**
 * Store credentials behind the OS biometric gate. Returns false when the
 * write is rejected (no passcode set, web, hardware refusal) — callers must
 * treat that as "biometric sign-in not enabled".
 */
export async function enableBiometricLogin(creds: BiometricCredentials): Promise<boolean> {
  if (isWeb()) return false
  try {
    await SecureStore.setItemAsync(BIOMETRIC_CREDS_KEY, JSON.stringify(creds), {
      requireAuthentication: true,
      keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      authenticationPrompt: 'Confirm to enable biometric sign-in',
    })
    await storage.setItem(BIOMETRIC_ENABLED_KEY, '1')
    await storage.deleteItem(BIOMETRIC_ATTEMPTS_KEY)
    await storage.deleteItem(BIOMETRIC_DECLINED_KEY)
    return true
  } catch {
    return false
  }
}

/** Wipe gated credentials + flags. Used on sign-out, opt-out, and attempt lockout. */
export async function disableBiometricLogin(): Promise<void> {
  if (!isWeb()) {
    await SecureStore.deleteItemAsync(BIOMETRIC_CREDS_KEY).catch(() => {})
  }
  await storage.deleteItem(BIOMETRIC_ENABLED_KEY)
  await storage.deleteItem(BIOMETRIC_ATTEMPTS_KEY)
}

/**
 * Read the gated credentials — this call triggers the OS biometric prompt.
 * Returns null when the user cancels or the biometric check fails; after
 * MAX_BIOMETRIC_ATTEMPTS consecutive failures the stored creds are cleared.
 */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  if (isWeb()) return null
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDS_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Sign in',
    })
    if (!raw) {
      // Keychain item vanished (OS reset, reinstall) — drop the stale flag.
      await disableBiometricLogin()
      return null
    }
    await storage.deleteItem(BIOMETRIC_ATTEMPTS_KEY)
    return JSON.parse(raw) as BiometricCredentials
  } catch {
    const prev = Number((await storage.getItem(BIOMETRIC_ATTEMPTS_KEY).catch(() => null)) ?? '0')
    const attempts = prev + 1
    if (attempts >= MAX_BIOMETRIC_ATTEMPTS) {
      await disableBiometricLogin()
    } else {
      await storage.setItem(BIOMETRIC_ATTEMPTS_KEY, String(attempts))
    }
    return null
  }
}
