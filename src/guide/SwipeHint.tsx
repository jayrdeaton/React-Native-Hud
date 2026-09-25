import { useAutoPaperTheme } from '@rific/auto-paper'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Icon } from 'react-native-paper'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'
export type SwipePointer = 'finger' | 'mouse'

export interface SwipeHintProps {
  direction?: SwipeDirection
  // What sweeps along the path: a fingertip ring (a touch screen) or a mouse (a desktop seat that
  // plays by dragging). The mouse variant also relabels itself "Drag" for screen readers, since a
  // desktop player should never be told to swipe.
  pointer?: SwipePointer
  // Defaults to the theme's own primary — i.e. the player's own seat color in the fleet games.
  color?: string
  // Length of the dotted path in points, arrowhead excluded.
  length?: number
}

const DOT_COUNT = 7
const FINGER_SIZE = 28
const MOUSE_SIZE = 30
const SWEEP_MS = 900
const PAUSE_MS = 500

const ARROW_ICON: Record<SwipeDirection, string> = { up: 'arrow-up', down: 'arrow-down', left: 'arrow-left', right: 'arrow-right' }

// A finger-sized ring (or, with pointer='mouse', a mouse) sweeping along a dotted path toward an
// arrowhead, on a loop — the "swipe this way" illustration the arcade games (LightCycles, Snake, Pong,
// AirHockey, BoxHockey) each need for their first card, so it lives here once rather than being
// redrawn per app. The mouse variant is the same card on desktop web for a seat that plays by
// dragging; Snake and AirHockey each drew their own before it existed. Plain Views plus Reanimated:
// no Skia, no SVG, so it renders identically in every consuming app (Hangman, which has neither,
// included). Under reduced motion the pointer just rests at the midpoint, still visible.
export function SwipeHint({ direction = 'right', pointer = 'finger', color, length = 96 }: SwipeHintProps) {
  const { colors } = useAutoPaperTheme()
  const tint = color ?? colors.primary
  const reducedMotion = useReducedMotion()
  const progress = useSharedValue(0.5)
  const horizontal = direction === 'left' || direction === 'right'
  // Which way the finger travels along its own axis — left/up run against the positive x/y axes.
  const sign = direction === 'right' || direction === 'down' ? 1 : -1

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 0.5
      return
    }
    // Sweep out, hold (the ring fades while it rests at the end), then snap back to the start.
    progress.value = 0
    progress.value = withRepeat(withSequence(withTiming(1, { duration: SWEEP_MS, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: PAUSE_MS }), withTiming(0, { duration: 0 })), -1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  const fingerStyle = useAnimatedStyle(() => {
    const travel = (progress.value - 0.5) * length * sign
    return {
      opacity: reducedMotion ? 1 : Math.min(1, progress.value * 6, (1 - progress.value) * 6 + 0.001),
      transform: horizontal ? [{ translateX: travel }] : [{ translateY: travel }]
    }
  })

  const axis = horizontal ? (sign > 0 ? 'row' : 'row-reverse') : sign > 0 ? 'column' : 'column-reverse'

  return (
    <View accessibilityLabel={`${pointer === 'mouse' ? 'Drag' : 'Swipe'} ${direction}`} accessible style={[styles.path, { flexDirection: axis }]}>
      <View style={[styles.dots, { flexDirection: axis, [horizontal ? 'width' : 'height']: length }]}>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: tint, opacity: 0.35 + (0.65 * i) / (DOT_COUNT - 1) }]} />
        ))}
      </View>
      <Icon source={ARROW_ICON[direction]} size={28} color={tint} />
      {pointer === 'mouse' ? (
        <Animated.View style={[styles.mouse, fingerStyle]}>
          <Icon source='mouse' size={MOUSE_SIZE} color={tint} />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.finger, { borderColor: tint }, fingerStyle]} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6
  },
  dots: {
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  // Centered on the whole path (not on the dots row alone) by the container's own alignItems/
  // justifyContent, then pushed along the axis by its own animated translate — absolute so it never
  // takes space from the dots and arrowhead it's drawn over.
  finger: {
    borderRadius: FINGER_SIZE / 2,
    borderWidth: 3,
    height: FINGER_SIZE,
    position: 'absolute',
    width: FINGER_SIZE
  },
  // Positioned exactly like `finger` (absolute, centered by the container, moved by the same animated
  // translate); only what's drawn differs.
  mouse: {
    position: 'absolute'
  },
  path: {
    alignItems: 'center',
    justifyContent: 'center'
  }
})
