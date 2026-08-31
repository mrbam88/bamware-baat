import { useRef } from 'react'
import {
  Animated, PanResponder, Dimensions, StyleSheet,
  View, Text,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import type { Profile } from '../api/discover'
import { MatchBadge } from './MatchBadge'
import { Colors, Fonts, Radius, FontSize, Spacing } from '../theme'

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35
const SWIPE_OUT_DURATION = 220
const CARD_HEIGHT = Dimensions.get('window').height * 0.68

interface Props {
  profile: Profile
  onSwipe: (direction: 'like' | 'pass') => void
}

export function SwipeCard({ profile, onSwipe }: Props) {
  const position = useRef(new Animated.ValueXY()).current

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  })

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const passOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  function swipeOut(direction: 'like' | 'pass') {
    const x = direction === 'like' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 })
      onSwipe(direction)
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy })
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) swipeOut('like')
        else if (gesture.dx < -SWIPE_THRESHOLD) swipeOut('pass')
        else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start()
        }
      },
    }),
  ).current

  return (
    <Animated.View
      style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
      {...panResponder.panHandlers}
    >
      {/* Photo or placeholder */}
      {profile.photos.length > 0 ? (
        <Image
          source={{ uri: profile.photos[0] }}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.placeholderInitial}>{profile.name[0]}</Text>
        </View>
      )}

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* LIKE badge */}
      <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={[styles.badgeText, { color: Colors.success }]}>LIKE</Text>
      </Animated.View>

      {/* PASS badge */}
      <Animated.View style={[styles.badge, styles.passBadge, { opacity: passOpacity }]}>
        <Text style={[styles.badgeText, { color: Colors.error }]}>PASS</Text>
      </Animated.View>

      {/* Profile info */}
      <View style={styles.info}>
        <MatchBadge score={profile.matchScore} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.age}>{profile.age}</Text>
        </View>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={13} color={Colors.textSecondary} />
          <Text style={styles.borough}>{profile.borough.replace('_', ' ')}</Text>
        </View>
        {profile.bio ? <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text> : null}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 32,
    height: CARD_HEIGHT,
    alignSelf: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  photo: { width: '100%', height: '100%', position: 'absolute' },
  photoPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderInitial: {
    fontFamily: Fonts.display,
    fontSize: 96,
    color: Colors.accent,
  },
  gradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '55%',
  },
  badge: {
    position: 'absolute',
    top: 48,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2.5,
    borderRadius: Radius.sm,
  },
  likeBadge: { left: 20, borderColor: Colors.success },
  passBadge: { right: 20, borderColor: Colors.error },
  badgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    letterSpacing: 1,
  },
  info: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  name: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.textPrimary,
  },
  age: {
    fontFamily: 'Manrope_400Regular',
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  borough: {
    fontFamily: 'Manrope_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  bio: {
    fontFamily: 'Manrope_400Regular',
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
    marginTop: 2,
  },
})
