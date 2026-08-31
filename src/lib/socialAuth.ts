/**
 * Native SSO flows (issue #20).
 *
 * Each flow resolves the provider-issued identity token that the auth
 * service verifies server-side (mrbam88/bamware-auth-service#2).
 *
 * Conventions:
 * - Resolves `null` when the user dismisses the native sheet — callers treat
 *   that as a silent no-op (no error toast).
 * - Throws `SocialAuthUnavailableError` with a user-presentable message when
 *   the flow can't start at all (native module missing from the current dev
 *   build, or Google client IDs not provisioned yet). Screens surface the
 *   message via the standard error toast — never a crash.
 *
 * The native modules are imported lazily so a dev build produced before
 * these deps were added (CNG — ios/ and android/ are generated) degrades
 * gracefully instead of crashing at JS bundle evaluation.
 */
import { Platform } from 'react-native'
import type { SocialProvider } from '../api/auth'

/** The flow can't start; `message` is safe to show to the user. */
export class SocialAuthUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SocialAuthUnavailableError'
  }
}

export interface SocialCredential {
  idToken: string
  name?: string
}

// Provisioned via the Human-only board card (Google Cloud console); until
// then these are undefined and the Google flow fails soft with a toast.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

let googleConfigured = false

async function signInWithApple(): Promise<SocialCredential | null> {
  if (Platform.OS !== 'ios') {
    // Apple-on-Android needs a web flow — out of scope for issue #20.
    throw new SocialAuthUnavailableError('Sign in with Apple is only available on iOS.')
  }

  let AppleAuthentication: typeof import('expo-apple-authentication')
  try {
    AppleAuthentication = await import('expo-apple-authentication')
  } catch {
    throw new SocialAuthUnavailableError(
      'Sign in with Apple needs an updated app build. Please update the app and try again.',
    )
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!credential.identityToken) {
      throw new Error('Apple returned no identity token')
    }
    // Apple only shares the name on first authorization — forward it when present.
    const name =
      [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || undefined
    return { idToken: credential.identityToken, name }
  } catch (err) {
    if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return null
    throw err
  }
}

async function signInWithGoogle(): Promise<SocialCredential | null> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    // Client IDs aren't provisioned yet (issue #20 — Human-only board card).
    throw new SocialAuthUnavailableError(
      "Google Sign-In isn't available yet. Please sign in with email for now.",
    )
  }

  let google: typeof import('@react-native-google-signin/google-signin')
  try {
    google = await import('@react-native-google-signin/google-signin')
  } catch {
    throw new SocialAuthUnavailableError(
      'Google Sign-In needs an updated app build. Please update the app and try again.',
    )
  }
  const { GoogleSignin, statusCodes, isErrorWithCode } = google

  if (!googleConfigured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    })
    googleConfigured = true
  }

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }
    const response = await GoogleSignin.signIn()
    if (response.type === 'cancelled') return null
    const { idToken, user } = response.data
    if (!idToken) {
      throw new Error('Google returned no ID token')
    }
    return { idToken, name: user.name ?? undefined }
  } catch (err) {
    if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) return null
    throw err
  }
}

/**
 * Run the native sign-in flow for `provider`.
 * Resolves the credential, or `null` if the user cancelled.
 */
export async function getSocialCredential(provider: SocialProvider): Promise<SocialCredential | null> {
  return provider === 'apple' ? signInWithApple() : signInWithGoogle()
}
