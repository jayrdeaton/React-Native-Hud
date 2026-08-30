import { act, renderHook } from '@testing-library/react'
import type { View } from 'react-native'

import { useAutoAlign } from '../useAutoAlign'

// The mocked useWindowDimensions is fixed at width 402 / height 874 (see
// src/__mocks__/react-native.ts), and useAutoAlign keeps a 12px EDGE_MARGIN off every screen edge.
// All the geometry chosen below is worked out against those two fixed numbers.

// Manually stands in for the trigger ref a real <View> would attach — renderHook never mounts one,
// so triggerRef.current is otherwise always null and measure() would no-op. measureInWindow fires
// its callback synchronously here (unlike the real native bridge), which is what lets `measured`
// settle to true within the same act() as the render that triggers it.
const fakeTrigger = (x: number, y: number, width: number, height: number) =>
  ({
    measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => cb(x, y, width, height)
  }) as unknown as View

describe('useAutoAlign', () => {
  it('starts with the unmeasured defaults before ever opening', () => {
    const { result } = renderHook(() => useAutoAlign(false, 100, 100))

    expect(result.current.measured).toBe(false)
    expect(result.current.align).toBe('center')
    expect(result.current.verticalAlign).toBe('below')
  })

  it('flips align to right when the measured rect overflows the right edge only', () => {
    // centerX = 350 + 10 = 360. overflowsRight: 360 + 50 = 410 > 402 - 12 (390) -> true.
    // overflowsLeft: 360 - 50 = 310, not < 12 -> false.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(350, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.align).toBe('right')
  })

  it('flips align to left when the measured rect overflows the left edge only', () => {
    // centerX = 10 + 10 = 20. overflowsLeft: 20 - 50 = -30 < 12 -> true.
    // overflowsRight: 20 + 50 = 70, not > 390 -> false.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(10, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.align).toBe('left')
  })

  it('falls back to center when the content is wide enough to overflow both edges at once', () => {
    // A trigger dead-center on screen with content wider than the whole window overflows both
    // sides simultaneously -> the documented least-bad fallback is 'center'.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 600, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(191, 100, 20, 20) // centerX = 201, screen center
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.align).toBe('center')
  })

  it('flips verticalAlign to above when there is more room above than below and the content does not fit below', () => {
    // Trigger near the bottom of the 874-tall screen: y=800, height=20 -> bottom edge 820.
    // roomBelow = 874 - 820 - 12 = 42. roomAbove = 800 - 12 = 788.
    // contentHeight(100) > roomBelow(42) and roomAbove(788) > roomBelow(42) -> flips to 'above'.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 800, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.verticalAlign).toBe('above')
    expect(result.current.maxHeight).toBe(788)
  })

  it('stays below in the common case where there is enough room below, with maxHeight reflecting that room', () => {
    // y=100, height=20 -> bottom edge 120. roomBelow = 874 - 120 - 12 = 742.
    // contentHeight(100) > roomBelow(742) is false, so it stays 'below' regardless of roomAbove.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.verticalAlign).toBe('below')
    expect(result.current.maxHeight).toBe(742)
  })

  it('clamps maxHeight to zero rather than a negative number when the picked side has no room at all', () => {
    // Trigger spans almost the entire screen height (y=0, height=900, past the 874 window height),
    // leaving negative room on both sides: roomBelow = 874 - 900 - 12 = -38, roomAbove = 0 - 12 = -12.
    // above = contentHeight(5) > roomBelow(-38) [true] && roomAbove(-12) > roomBelow(-38) [true]
    // -> picks 'above', and Math.max(roomAbove, 0) clamps the negative room to 0.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 5), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 0, 20, 900)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.verticalAlign).toBe('above')
    expect(result.current.maxHeight).toBe(0)
  })

  it('resets measured to false on the render where open flips back to true after closing, then re-measures synchronously', () => {
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 100, 20, 20)
    act(() => rerender({ open: true }))
    expect(result.current.measured).toBe(true)

    // Closing doesn't reset `measured` on its own (the reset only fires on the false->true edge,
    // per the render-phase check in the source) — it simply stays at whatever the last open
    // measured, since nothing re-renders its consumer once closed anyway.
    act(() => rerender({ open: false }))
    expect(result.current.measured).toBe(true)

    // Reopening is the edge that resets it — false on this render, then true again once the
    // (synchronous, in this mocked setup) measureInWindow callback fires inside the same act().
    result.current.triggerRef.current = fakeTrigger(10, 10, 20, 20)
    act(() => rerender({ open: true }))
    expect(result.current.measured).toBe(true)
  })

  it('re-measures when contentWidth/contentHeight change while still open, updating align, verticalAlign and maxHeight', () => {
    const { result, rerender } = renderHook(({ open, contentWidth, contentHeight }: { open: boolean; contentWidth: number; contentHeight: number }) => useAutoAlign(open, contentWidth, contentHeight), {
      initialProps: { open: false, contentWidth: 100, contentHeight: 100 }
    })

    // Initial open: trigger near the top-left-ish center, narrow/short content -> fits, so
    // align stays 'center' and verticalAlign stays 'below'.
    // centerX = 300 + 10 = 310. overflowsRight: 310 + 50 = 360 > 390? no. overflowsLeft: 310 - 50 = 260 < 12? no.
    // bottom edge = 120, roomBelow = 874 - 120 - 12 = 742. contentHeight(100) > 742? no -> below.
    result.current.triggerRef.current = fakeTrigger(300, 100, 20, 20)
    act(() => rerender({ open: true, contentWidth: 100, contentHeight: 100 }))

    expect(result.current.align).toBe('center')
    expect(result.current.verticalAlign).toBe('below')
    expect(result.current.maxHeight).toBe(742)

    // Still open: widen and heighten the content, and reconfigure the fake measurement to a
    // trigger near the bottom of the screen. The memoized `measure` callback's identity changes
    // because contentWidth/contentHeight changed, so the effect re-runs and re-measures even
    // though `open` itself didn't change.
    // centerX = 310 (same). overflowsRight: 310 + 100 = 410 > 390 -> true. overflowsLeft: 310 - 100 = 210 < 12? no -> 'right'.
    // bottom edge = 820, roomBelow = 874 - 820 - 12 = 42, roomAbove = 800 - 12 = 788.
    // contentHeight(100) > roomBelow(42) [true] && roomAbove(788) > roomBelow(42) [true] -> 'above', maxHeight = 788.
    result.current.triggerRef.current = fakeTrigger(300, 800, 20, 20)
    act(() => rerender({ open: true, contentWidth: 200, contentHeight: 100 }))

    expect(result.current.align).toBe('right')
    expect(result.current.verticalAlign).toBe('above')
    expect(result.current.maxHeight).toBe(788)
  })
})
