import React, {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState,
} from 'react'
import {
  Animated, Easing, Pressable, StyleSheet, Text, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../theme'

type ToastVariant = 'info' | 'success' | 'error'

export type ToastOptions = {
  message: string
  title?: string
  variant?: ToastVariant
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

type ToastContextValue = {
  showToast: (options: ToastOptions) => void
  hideToast: () => void
}

type InternalToast = ToastOptions & { id: number }

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const [toast, setToast] = useState<InternalToast | null>(null)
  const [visible, setVisible] = useState(false)
  const translateY = useRef(new Animated.Value(-120)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)

  const hideToast = useCallback(() => {
    if (!visible) return
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    Animated.timing(translateY, {
      toValue: -120, duration: 180,
      easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(() => { setVisible(false); setToast(null) })
  }, [translateY, visible])

  const showToast = useCallback((options: ToastOptions) => {
    idRef.current += 1
    const next: InternalToast = { id: idRef.current, variant: 'info', durationMs: 4000, ...options }
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setToast(next)
    setVisible(true)
    Animated.timing(translateY, {
      toValue: 0, duration: 220,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start()
    if (!next.onAction && next.durationMs && next.durationMs > 0) {
      timer.current = setTimeout(hideToast, next.durationMs)
    }
  }, [translateY, hideToast])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const palette = useMemo(() => {
    switch (toast?.variant) {
      case 'success': return {
        bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.5)',
        title: Colors.success,        message: 'rgba(255,255,255,0.8)',
        actionBg: Colors.success,
      }
      case 'error': return {
        bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.5)',
        title: Colors.error,          message: 'rgba(255,255,255,0.8)',
        actionBg: Colors.error,
      }
      default: return {
        bg: Colors.surface,           border: Colors.borderLight,
        title: Colors.textPrimary,    message: Colors.textSecondary,
        actionBg: Colors.accent,
      }
    }
  }, [toast?.variant])

  const value = useMemo<ToastContextValue>(() => ({ showToast, hideToast }), [showToast, hideToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && visible && (
        <Animated.View
          pointerEvents="box-none"
          style={[S.wrap, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}
        >
          <View style={[S.toast, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            <View style={S.texts}>
              {!!toast.title && <Text style={[S.title, { color: palette.title }]}>{toast.title}</Text>}
              <Text style={[S.message, { color: palette.message }]}>{toast.message}</Text>
            </View>
            {!!toast.actionLabel && !!toast.onAction && (
              <Pressable
                onPress={() => { toast.onAction?.(); hideToast() }}
                style={[S.action, { backgroundColor: palette.actionBg }]}
              >
                <Text style={S.actionText}>{toast.actionLabel}</Text>
              </Pressable>
            )}
            <Pressable onPress={hideToast} style={S.closeHit}>
              <Text style={[S.closeText, { color: palette.message }]}>×</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

const S = StyleSheet.create({
  wrap:        { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99, alignItems: 'center' },
  toast:       { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginHorizontal: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  texts:       { flex: 1 },
  title:       { fontFamily: 'Manrope_600SemiBold', fontSize: 14, marginBottom: 2 },
  message:     { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  action:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  actionText:  { fontFamily: 'Manrope_600SemiBold', fontSize: 12, color: '#fff' },
  closeHit:    { paddingHorizontal: 6, paddingVertical: 6, marginLeft: 2 },
  closeText:   { fontFamily: 'Manrope_400Regular', fontSize: 18, lineHeight: 18 },
})
