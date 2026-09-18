import { useZoneBounds, type ZoneBounds } from '@tastic/split-screen'
import { act, renderHook } from '@testing-library/react'
import type { View } from 'react-native'

import { useZoneClampedAlign } from '../useZoneClampedAlign'

// Same fixed mocked useWindowDimensions (402x874) and 12px EDGE_MARGIN this file's sibling
// useAutoAlign.test.ts already documents and works its own geometry out against — every number
// below is worked out against those same two constants, plus insets.{top,bottom} fixed at 0 by
// src/__mocks__/react-native-safe-area-context.ts.

// Same stand-in useAutoAlign.test.ts uses for the trigger ref a real <View> would attach —
// renderHook never mounts one, so triggerRef.current is otherwise always null. measureInWindow
// fires its callback synchronously here, which is what lets both useAutoAlign's own measurement
// and this hook's own follow-up zone-aware re-measurement settle within the same act().
const fakeTrigger = (x: number, y: number, width: number, height: number) =>
  ({
    measureInWindow: (cb: (x: number, y: number, width: number, height: number) => void) => cb(x, y, width, height)
  }) as unknown as View

describe('useZoneClampedAlign', () => {
  it("passes useAutoAlign's own decision through unchanged when there is no zone (useZoneBounds returns null)", () => {
    // useZoneBounds mocks to null by default (see src/__mocks__/tastic-split-screen.ts) — nothing to
    // override here. Same trigger/content as useAutoAlign.test.ts's own "stays below" case: bottom
    // edge = 120, roomBelow = 874 - 120 - 12 = 742 -> below is left alone, not re-derived.
    const { result, rerender } = renderHook(({ open }) => useZoneClampedAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(useZoneBounds).toHaveBeenCalled()
    expect(result.current.measured).toBe(true)
    expect(result.current.align).toBe('center')
    expect(result.current.verticalAlign).toBe('below')
    expect(result.current.maxHeight).toBe(742)
  })

  it('stays on the away-from-shared-row side when the content fits there', () => {
    // belowShared -> awaySide 'below' (bounded by the bottom safe area), towardSide 'above' (bounded
    // by sharedEdgeY). Bottom edge = 120, awayRoom = 874 - 0 - 120 - 12 = 742. sharedEdgeY sits just
    // above the trigger (90), so towardRoom = 100 - 90 - 12 = -2 either way. contentHeight(50) fits
    // comfortably in awayRoom -> useToward is false regardless of towardRoom's own sign.
    const zone: ZoneBounds = { sharedEdgeY: 90, zoneSide: 'belowShared', rotated: false }
    ;(useZoneBounds as jest.Mock).mockReturnValue(zone)

    const { result, rerender } = renderHook(({ open }) => useZoneClampedAlign(open, 100, 50), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.verticalAlign).toBe('below')
    expect(result.current.maxHeight).toBe(742)
  })

  it('flips toward the shared row when the away side does not fit and the shared side genuinely has more room', () => {
    // belowShared, trigger near the bottom of the zone: y=800, height=20 -> bottom edge 820.
    // awayRoom = 874 - 0 - 820 - 12 = 42. sharedEdgeY=100 sits well above the trigger, so
    // towardRoom = 800 - 100 - 12 = 688. contentHeight(100) > awayRoom(42) and towardRoom(688) >
    // awayRoom(42) -> flips to the toward side, 'above' for an unrotated belowShared zone.
    //
    // Note this genuinely differs from what plain useAutoAlign would have picked for this same
    // trigger against the raw window edge (roomAbove = 800 - 12 = 788, per useAutoAlign.test.ts's
    // own identical fixture) — maxHeight here is 688, bounded by the zone's own sharedEdgeY, not 788.
    const zone: ZoneBounds = { sharedEdgeY: 100, zoneSide: 'belowShared', rotated: false }
    ;(useZoneBounds as jest.Mock).mockReturnValue(zone)

    const { result, rerender } = renderHook(({ open }) => useZoneClampedAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 800, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.verticalAlign).toBe('above')
    expect(result.current.maxHeight).toBe(688)
  })

  it('threads an explicit rotation through to the underlying useAutoAlign fallback (no zone)', () => {
    // Same fixture and arithmetic as useAutoAlign.test.ts's own "picks the alignment the trigger is
    // ACTUALLY near once rotation is accounted for" case: raw (350, 100, 20, 20) resolves to 'right'
    // at rotation 0 but reflects near the LEFT edge once rotateRect'd through a 180° ancestor. This
    // only exercises the `if (!zone) return auto` fallback — see this hook's own doc for why that's
    // the one path `rotation` is currently guaranteed to affect.
    const { result, rerender } = renderHook(({ open }) => useZoneClampedAlign(open, 100, 100, 180), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(350, 100, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.align).toBe('left')
  })

  it('flips the real-world direction back to its local label inside a rotated (p2-style) zone — the single easiest regression to miss', () => {
    // Identical geometry to the "flips toward the shared row" case above — only `rotated` changes,
    // to isolate the inversion on its own (zoneSide and rotated are independent fields on
    // ZoneBounds; a real DualZoneLayout usually pairs rotated with 'aboveShared' for p2, but this
    // hook never assumes that pairing, so this test doesn't either). useToward still resolves true
    // for the same reason as above (towardRoom 688 > awayRoom 42), which would pick the real-world
    // 'above' — but PopoverBody's local-then-rotate positioning means a rotated zone has to paint
    // that as local 'below' instead, or the popover ends up pointing at the real-world direction
    // this hook was trying to avoid. maxHeight is untouched by the flip — only the label inverts.
    const zone: ZoneBounds = { sharedEdgeY: 100, zoneSide: 'belowShared', rotated: true }
    ;(useZoneBounds as jest.Mock).mockReturnValue(zone)

    const { result, rerender } = renderHook(({ open }) => useZoneClampedAlign(open, 100, 100), {
      initialProps: { open: false }
    })

    result.current.triggerRef.current = fakeTrigger(100, 800, 20, 20)
    act(() => rerender({ open: true }))

    expect(result.current.measured).toBe(true)
    expect(result.current.verticalAlign).toBe('below')
    expect(result.current.maxHeight).toBe(688)
  })
})
