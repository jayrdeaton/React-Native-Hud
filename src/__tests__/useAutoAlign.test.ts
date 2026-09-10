import { act, renderHook } from '@testing-library/react'
import type { View } from 'react-native'

import { rotateRect, useAutoAlign } from '../useAutoAlign'

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

describe('rotateRect', () => {
  // Window fixed at 402x874 throughout, matching every other test in this file — center (201, 437).

  it('passes a rect through unchanged at rotation 0', () => {
    expect(rotateRect(10, 20, 30, 40, 0, 402, 874)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })

  it('reflects a rect through the window center at rotation 180, size unchanged', () => {
    // The exact trigger from the 'overflows right' useAutoAlign test above: rect center (360, 110).
    // Offset from window center (201, 437): (159, -327). 180° negates both -> new offset (-159, 327)
    // -> new rect center (42, 764) -> new x/y = center - width/2 = (42 - 10, 764 - 10) = (32, 754).
    // Notice this rect was near the window's RIGHT edge (x=350 of 402) before reflecting, and is now
    // near its LEFT edge (x=32) — the exact inversion that made the real bug possible: code that
    // aligned against the raw (350, ...) would pick 'right' for content that's actually near the
    // left edge once the 180° rotation this rect's real ancestor applies is accounted for.
    expect(rotateRect(350, 100, 20, 20, 180, 402, 874)).toEqual({ x: 32, y: 754, width: 20, height: 20 })
  })

  it('rotates a rect 90° clockwise about the window center, swapping width/height', () => {
    // Rect center (20, 447), offset from window center (201, 437): (-181, 10). Clockwise 90°:
    // (newDx, newDy) = (-dy, dx) = (-10, -181) -> new center (191, 256) -> width/height swap to
    // (20, 20) here (both already equal, so the swap isn't visible in the numbers — the next test
    // uses an asymmetric rect specifically to make the swap itself observable) -> x/y = center -
    // newWidth/2, newHeight/2 = (191 - 10, 256 - 10) = (181, 246).
    expect(rotateRect(10, 437, 20, 20, 90, 402, 874)).toEqual({ x: 181, y: 246, width: 20, height: 20 })
  })

  it('swaps width and height at +90°/-90° but not at 180°, for a rect that is not itself square', () => {
    const at0 = rotateRect(100, 200, 30, 60, 0, 402, 874)
    const at90 = rotateRect(100, 200, 30, 60, 90, 402, 874)
    const atNeg90 = rotateRect(100, 200, 30, 60, -90, 402, 874)
    const at180 = rotateRect(100, 200, 30, 60, 180, 402, 874)

    expect(at0).toMatchObject({ width: 30, height: 60 })
    expect(at90).toMatchObject({ width: 60, height: 30 })
    expect(atNeg90).toMatchObject({ width: 60, height: 30 })
    expect(at180).toMatchObject({ width: 30, height: 60 })
  })

  it('rotates a rect -90° (counterclockwise) about the window center, the mirror of the +90° case', () => {
    // Same rect as the +90° test above. Counterclockwise: (newDx, newDy) = (dy, -dx) = (10, 181) ->
    // new center (211, 618) -> x/y = (211 - 10, 618 - 10) = (201, 608). A different result from +90°
    // (181, 246) — the two directions are genuinely distinct, not accidentally symmetric here.
    expect(rotateRect(10, 437, 20, 20, -90, 402, 874)).toEqual({ x: 201, y: 608, width: 20, height: 20 })
  })
})

describe('useAutoAlign with rotation', () => {
  it('defaults rotation to 0 — identical align to the plain (no-rotation) overload for the same raw measurement', () => {
    // Same fixture as the plain 'overflows right' test above, just calling the 4-arg overload
    // explicitly with 0 to confirm it is truly a no-op default, not merely unspecified behavior.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100, 0), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(350, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.align).toBe('right')
  })

  it('picks the alignment the trigger is ACTUALLY near once rotation is accounted for, not the raw pre-rotation measurement', () => {
    // The same raw (350, 100, 20, 20) that resolves to 'right' at rotation 0 (see the plain test
    // above) sits near the LEFT edge once reflected through a 180° ancestor (see rotateRect's own
    // 180° test for the arithmetic) — this is the exact shape of the real bug: a trigger sitting
    // inside a FakeLandscapeView rotated 180° that the old, rotation-blind measurement got backwards.
    const { result, rerender } = renderHook(({ open }) => useAutoAlign(open, 100, 100, 180), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(350, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.align).toBe('left')
  })

  it('re-measures when rotation itself changes while the popover stays open, the same as a live window resize already does', () => {
    const { result, rerender } = renderHook(({ open, rotation }: { open: boolean; rotation: 0 | 90 | -90 | 180 }) => useAutoAlign(open, 100, 100, rotation), {
      initialProps: { open: false, rotation: 0 as 0 | 90 | -90 | 180 }
    })

    result.current.triggerRef.current = fakeTrigger(350, 100, 20, 20)
    act(() => rerender({ open: true, rotation: 0 }))
    expect(result.current.align).toBe('right')

    // Device gets physically turned 180° while this popover is still open — same trigger, same
    // fixture, only `rotation` changes. The memoized `measure` callback's identity changes because
    // rotation is one of its own dependencies, so the effect re-runs and re-measures even though
    // `open` itself never flipped.
    act(() => rerender({ open: true, rotation: 180 }))
    expect(result.current.align).toBe('left')
  })
})
