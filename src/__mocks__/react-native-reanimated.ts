import { useState } from 'react'

// Real reanimated's whole point is running these off the JS thread without triggering React
// re-renders — the mock instead resolves synchronously, on the JS thread, so a plain re-render
// (RTL's rerender/act) is enough to observe an animation's end state without needing fake timers
// or a UI-thread bridge that jsdom has no equivalent of.
export const Easing = {
  cubic: (t: number) => t,
  linear: (t: number) => t,
  out: (fn: (t: number) => number) => fn
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
