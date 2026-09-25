import React, { useState } from 'react'

// Real reanimated's whole point is running these off the JS thread without triggering React
// re-renders — the mock instead resolves synchronously, on the JS thread, so a plain re-render
// (RTL's rerender/act) is enough to observe an animation's end state without needing fake timers
// or a UI-thread bridge that jsdom has no equivalent of.
export const Easing = {
  cubic: (t: number) => t,
  linear: (t: number) => t,
  out: (fn: (t: number) => number) => fn,
  // Overshoot amplitude ignored — same "identity-shaped stand-in" treatment as cubic/linear above,
  // since this mock only ever needs the settled (t=1) end value, never the curve's own shape along
  // the way.
  back: (_amplitude: number) => (t: number) => t
}

export interface SharedValue<T> {
  value: T
}

// A lazy useState initializer (never actually set again) rather than useRef — this needs the same
// "stable object identity across renders" property a ref would give, but react-hooks/refs flags
// reading `.current` during render (real reanimated's own shared values are meant to be read this
// way, mid-render, e.g. handed straight to a Skia <Path>; this mock just sidesteps the lint rule's
// inability to tell that apart from a genuine render-time ref read).
export function useSharedValue<T>(initial: T): SharedValue<T> {
  const [shared] = useState<SharedValue<T>>(() => ({ value: initial }))
  return shared
}

// Recomputed on every call (not memoized against `deps`) — a plain mock has no worklet/UI-thread
// machinery to invalidate against, so the simplest faithful stand-in is "always reflects the
// latest shared-value reads," which is what a real derived value converges to anyway.
export function useDerivedValue<T>(fn: () => T, _deps?: unknown[]): SharedValue<T> {
  return { value: fn() }
}

// Config/callback ignored — jumps straight to the end value, synchronously, so the calling
// `useLayoutEffect` sees the settled state within the same commit a test's `render`/`rerender`
// already waits on.
export function withTiming<T>(toValue: T, _config?: unknown, callback?: (finished: boolean) => void): T {
  callback?.(true)
  return toValue
}

// Delay ignored, same treatment as withTiming's own config above — `animation` here is already the
// fully-resolved end value (whatever the wrapped withTiming/withSequence/etc. call itself
// resolved to under this same mock), so passing it straight through is what "settles instantly,
// synchronously" actually means for a delayed animation under this mock.
export function withDelay<T>(_delayMs: number, animation: T): T {
  return animation
}

// Recomputed on every call, not memoized against a dependency array the way the real worklet-based
// hook would be — same reasoning as useDerivedValue above: this mock has no worklet/UI-thread
// machinery to invalidate against, so "always reflects whatever the latest shared-value reads are
// at render time" is the simplest faithful stand-in, and it's what a real animated style converges
// to once its own shared values settle anyway.
export function useAnimatedStyle<T>(fn: () => T): T {
  return fn()
}

// A test that needs the reduced-motion branch flips this per test, same as every other jest.fn() mock
// in this directory — defaults to motion allowed.
export const useReducedMotion = jest.fn(() => false)

// Both collapse to their own end value, same "settle instantly, synchronously" treatment as
// withTiming/withDelay above — a repeat is only ever observed at its first iteration's end state,
// and a sequence's end state is its last step's.
export function withRepeat<T>(animation: T, _numberOfReps?: number, _reverse?: boolean): T {
  return animation
}

export function withSequence<T>(...animations: T[]): T {
  return animations[animations.length - 1]
}

const stub = ({ children }: { children?: React.ReactNode }) => children ?? null

// Real Animated.View/Animated.Text are createAnimatedComponent-wrapped native primitives that
// apply a worklet-computed style outside of React's own render/commit cycle — under this mock,
// useAnimatedStyle above already resolves that style synchronously at render time (a plain object,
// not a worklet handle), so these just need to render like any other bare View/Text stub in this
// package's own mocks (see react-native.ts/react-native-paper.ts), captured as jest.fn()s so a test
// can inspect exactly what style/props a given letter actually received.
const Animated = {
  View: jest.fn(stub),
  Text: jest.fn(stub)
}

export default Animated
