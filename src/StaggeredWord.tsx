import { useEffect } from 'react'
import { LayoutChangeEvent, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

const STAGGER_MS = 45
const LETTER_DURATION_MS = 320

// The one formula every consumer's own follow-on animation (a paddle rally, a bouncing puck, a
// looping trail) needs in order to time its own entrance off "once the letters have mostly
// landed" — five apps (AirHockey, BoxHockey, Pong, LightCycles, Snake) had each independently
// re-derived `(letterCount - 1) * STAGGER_MS + LETTER_DURATION_MS` locally as their own
// `TOTAL_STAGGER_MS` constant. Exported as a pure function, not a component return value, so a
// caller can compute it once, outside render, the same way every one of those apps already did.
// `letterCount` is the TOTAL number of letters actually animated, not necessarily a single
// StaggeredWord's own `word.length` — see `startIndex` below for a multi-word wordmark, where a
// second word's letters continue the same overall stagger sequence.
export function getStaggeredWordDuration(letterCount: number): number {
  return (letterCount - 1) * STAGGER_MS + LETTER_DURATION_MS
}

interface AnimatedLetterProps {
  char: string
  index: number
  color: string
  reducedMotion: boolean
  fontFamily: string
  fontSize: number
  lineHeight: number
  fontWeight?: TextStyle['fontWeight']
  letterSpacing?: number
}

function AnimatedLetter({ char, index, color, reducedMotion, fontFamily, fontSize, lineHeight, fontWeight, letterSpacing }: AnimatedLetterProps) {
  const progress = useSharedValue(reducedMotion ? 1 : 0)

  useEffect(() => {
    if (reducedMotion) return
    progress.value = withDelay(index * STAGGER_MS, withTiming(1, { duration: LETTER_DURATION_MS, easing: Easing.out(Easing.back(1.5)) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }, { scale: 0.85 + progress.value * 0.15 }]
  }))

  return (
    <Animated.Text allowFontScaling={false} style={[{ color, fontFamily, fontSize, lineHeight, fontWeight, letterSpacing }, style]}>
      {char}
    </Animated.Text>
  )
}

export interface StaggeredWordProps {
  word: string
  color: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  // Whether to skip the stagger entirely and render every letter already fully settled — wire
  // straight from react-native-reanimated's own useReducedMotion() at the call site rather than
  // this component calling it internally, so a caller composing several StaggeredWords (see
  // `startIndex` below) only needs the one hook call, not one per word.
  reducedMotion: boolean
  // Continues the stagger sequence from a larger overall wordmark this word is only one line/part
  // of — this word's own first letter animates at index `startIndex`, its second at
  // `startIndex + 1`, and so on. Defaults to 0 for a standalone single-word wordmark (Snake's
  // "SNAKE", Pong's "PONG"); a caller stacking multiple words (AirHockey's "AIR"/"HOCKEY",
  // BoxHockey's "BOX"/"HOCKEY", LightCycles' "Light"/"Cycles") passes the running total of letters
  // already animated by earlier words, so the whole wordmark reads as one continuous cascade
  // instead of each word restarting its own stagger from zero.
  startIndex?: number
  // Every consumer this component was extracted from hardcoded bold letters (baked into a fixed
  // StyleSheet entry, not a prop) — kept as the default here rather than a fixed style, so the one
  // consumer that doesn't want it (LightCycles, whose own registered display font is already
  // sufficiently bold on its own) can opt out with `fontWeight='normal'` instead of this component
  // forcing it unconditionally.
  fontWeight?: TextStyle['fontWeight']
  // Unset by default — only AirHockey/BoxHockey/Pong's shared MONO_FONT-based letter style actually
  // wants extra tracking; Snake's/LightCycles' own theme fonts don't.
  letterSpacing?: number
  // The wrapping row's own style — e.g. LightCycles' own vertical offset for its second word
  // beneath its first.
  style?: StyleProp<ViewStyle>
  // Lets a caller measure this word's own rendered box (e.g. to size/position a follow-on canvas
  // overlay the way Snake's HeroSnakeTrail or LightCycles' HeroTitleTrails do) the same way it
  // would measure any other plain View.
  onLayout?: (e: LayoutChangeEvent) => void
}

// One row of letters staggering in on mount (or rendered already fully settled under reduced
// motion) — the "AnimatedLetter" building block five apps' own hero-title screens
// (AirHockey/BoxHockey/Pong/LightCycles/Snake's own HeroTitle.tsx/AnimatedHeroTitle.tsx) had each
// hand-rolled independently, identical down to the same 45ms stagger, 320ms per-letter duration,
// and back-ease overshoot. A single word/line on its own, or one of several stacked/side-by-side
// words sharing one overall stagger sequence via `startIndex` — this component only ever renders
// one row of letters; a caller composing more than one word renders more than one StaggeredWord
// (see `startIndex`'s own doc), the same way every one of those five apps' own `Word` helper
// already did internally.
export function StaggeredWord({ word, color, fontFamily, fontSize, lineHeight, reducedMotion, startIndex = 0, fontWeight = 'bold', letterSpacing, style, onLayout }: StaggeredWordProps) {
  return (
    <View style={[styles.row, style]} onLayout={onLayout}>
      {word.split('').map((char, i) => (
        <AnimatedLetter key={i} char={char} index={startIndex + i} color={color} reducedMotion={reducedMotion} fontFamily={fontFamily} fontSize={fontSize} lineHeight={lineHeight} fontWeight={fontWeight} letterSpacing={letterSpacing} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row'
  }
})
