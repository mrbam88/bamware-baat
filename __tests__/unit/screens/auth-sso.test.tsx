/**
 * Auth screen SSO wiring tests (issue #20).
 *
 * Renders the real login/sign-up screens (hooks and all) with
 * react-test-renderer, stubbing the shared component library down to host
 * strings. Verifies the SSO block is mounted on both screens and that the
 * screens' error handling matches the spec: real failures surface the error
 * toast, cancel/success stay silent.
 */
import type { JSX } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { useAuthStore } from '../../../src/store/authStore'
import { SocialAuthUnavailableError } from '../../../src/lib/socialAuth'
import LoginScreen from '../../../app/(auth)/login'
import SignUpScreen from '../../../app/(auth)/sign-up'

const mockShowToast = jest.fn()

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    flatten: (s: unknown) => s,
    hairlineWidth: 0.5,
  },
}))
jest.mock('../../../src/components', () => ({
  Screen: 'Screen',
  Text: 'Text',
  Button: 'Button',
  TextField: 'TextField',
  Checkbox: 'Checkbox',
  SocialAuthButtons: 'SocialAuthButtons',
  useToast: () => ({ showToast: mockShowToast, hideToast: jest.fn() }),
}))
// Login QoL (#17) additions the real screen now pulls in.
jest.mock('../../../src/hooks/useKeyboardVisible', () => ({
  useKeyboardVisible: () => false,
}))
jest.mock('../../../src/lib/biometricAuth', () => ({
  getRememberedEmail: jest.fn().mockResolvedValue(null),
  isBiometricLoginEnabled: jest.fn().mockResolvedValue(false),
  getBiometricCapability: jest.fn().mockResolvedValue({ available: false, label: null }),
}))

// react-test-renderer requires this flag for act() support outside react-dom.
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Silence the one-time react-test-renderer deprecation notice — it's the
// only renderer that works with this repo's string-stub react-native mock.
const realConsoleError = console.error.bind(console)
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) return
    realConsoleError(...args)
  })
})
afterAll(() => (console.error as jest.Mock).mockRestore())

const mockSocialLogin = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ user: null, isLoading: false, socialLogin: mockSocialLogin })
})

function renderScreen(Screen: () => JSX.Element) {
  let renderer!: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(<Screen />)
  })
  return renderer
}

describe.each([
  ['login', LoginScreen],
  ['sign-up', SignUpScreen],
] as const)('%s screen SSO block', (_name, Screen) => {
  it('mounts SocialAuthButtons wired to the store action', async () => {
    const renderer = renderScreen(Screen)
    const sso = renderer.root.findByType('SocialAuthButtons' as any)
    expect(sso.props.disabled).toBe(false)

    mockSocialLogin.mockResolvedValue(undefined)
    await act(async () => {
      sso.props.onPress('google')
    })
    expect(mockSocialLogin).toHaveBeenCalledWith('google')
    // Success (and cancel, which also resolves) shows no toast.
    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('surfaces real failures via the error toast', async () => {
    const renderer = renderScreen(Screen)
    const sso = renderer.root.findByType('SocialAuthButtons' as any)

    mockSocialLogin.mockRejectedValue(new Error('network down'))
    await act(async () => {
      sso.props.onPress('apple')
    })
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error', message: "Couldn't sign you in. Please try again." }),
    )
  })

  it('shows the availability message when a flow is not configured yet', async () => {
    const renderer = renderScreen(Screen)
    const sso = renderer.root.findByType('SocialAuthButtons' as any)

    mockSocialLogin.mockRejectedValue(
      new SocialAuthUnavailableError("Google Sign-In isn't available yet. Please sign in with email for now."),
    )
    await act(async () => {
      sso.props.onPress('google')
    })
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'error',
        message: "Google Sign-In isn't available yet. Please sign in with email for now.",
      }),
    )
  })
})
