import { type ReactNode, useRef, useState } from 'react'
import {
  KeyboardAvoidingView, type KeyboardAvoidingViewProps,
  Platform, ScrollView, type ScrollViewProps,
  StatusBar, type StyleProp, View, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../theme'

type Preset = 'fixed' | 'scroll' | 'auto'
type SafeEdge = 'top' | 'bottom' | 'left' | 'right'

interface BaseProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  backgroundColor?: string
  safeAreaEdges?: SafeEdge[]
  keyboardOffset?: number
  KeyboardAvoidingViewProps?: KeyboardAvoidingViewProps
  testID?: string
}

export interface FixedScreenProps extends BaseProps { preset?: 'fixed' }
export interface ScrollScreenProps extends BaseProps {
  preset?: 'scroll'
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps']
}
export interface AutoScreenProps extends Omit<ScrollScreenProps, 'preset'> {
  preset?: 'auto'
  scrollEnabledToggleThreshold?: { percent?: number }
}

export type ScreenProps = FixedScreenProps | ScrollScreenProps | AutoScreenProps

const isIos = Platform.OS === 'ios'

function useAutoPreset(threshold = 0.92) {
  const containerH = useRef<number | null>(null)
  const contentH = useRef<number | null>(null)
  const [scrollEnabled, setScrollEnabled] = useState(false)

  function update() {
    if (containerH.current == null || contentH.current == null) return
    setScrollEnabled(contentH.current >= containerH.current * threshold)
  }

  return {
    scrollEnabled,
    onLayout: (h: number) => { containerH.current = h; update() },
    onContentSizeChange: (_w: number, h: number) => { contentH.current = h; update() },
  }
}

export function Screen(props: ScreenProps) {
  const {
    preset = 'scroll',
    children,
    style,
    contentContainerStyle,
    backgroundColor = Colors.bg,
    safeAreaEdges = ['top'],
    keyboardOffset = 0,
    KeyboardAvoidingViewProps,
    testID,
  } = props

  const insets = useSafeAreaInsets()
  const auto = useAutoPreset((props as AutoScreenProps).scrollEnabledToggleThreshold?.percent)

  const safeStyle: ViewStyle = {
    paddingTop:    safeAreaEdges.includes('top')    ? insets.top    : 0,
    paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft:   safeAreaEdges.includes('left')   ? insets.left   : 0,
    paddingRight:  safeAreaEdges.includes('right')  ? insets.right  : 0,
  }

  const isScrollable = preset === 'scroll' || (preset === 'auto' && auto.scrollEnabled)

  return (
    <View testID={testID ?? 'screen'} style={[$fill, { backgroundColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />
      <KeyboardAvoidingView
        behavior={isIos ? 'padding' : 'height'}
        // iOS scrollable screens use the ScrollView's own keyboard insets
        // (automaticallyAdjustKeyboardInsets) which also scrolls the focused
        // field into view — the field the user is typing into stays visible on
        // SE-class devices (issue #17). Running KAV padding on top of that
        // double-compensates, so KAV is disabled for that combination.
        enabled={!(isIos && isScrollable)}
        keyboardVerticalOffset={keyboardOffset}
        {...KeyboardAvoidingViewProps}
        style={[$fill, KeyboardAvoidingViewProps?.style]}
      >
        {isScrollable ? (
          <ScrollView
            automaticallyAdjustKeyboardInsets={isIos}
            keyboardShouldPersistTaps={(props as ScrollScreenProps).keyboardShouldPersistTaps ?? 'handled'}
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onLayout={preset === 'auto' ? (e) => auto.onLayout(e.nativeEvent.layout.height) : undefined}
            onContentSizeChange={preset === 'auto' ? auto.onContentSizeChange : undefined}
            contentContainerStyle={[$inner, safeStyle, contentContainerStyle]}
            style={[$fill, style]}
          >
            {children}
          </ScrollView>
        ) : (
          <View
            onLayout={preset === 'auto' ? (e) => auto.onLayout(e.nativeEvent.layout.height) : undefined}
            style={[$fill, $inner, safeStyle, style, contentContainerStyle]}
          >
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  )
}

const $fill: ViewStyle  = { flex: 1, width: '100%' }
const $inner: ViewStyle = { flexGrow: 1 }
