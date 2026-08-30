import { Canvas, Skia } from '@shopify/react-native-skia'
import { render } from '@testing-library/react'

import { TriggerGauge, type TriggerGaugeProps } from '../TriggerGauge'

// Mirrors TriggerGauge.tsx's own private constants (not exported) -- recomputing the real formula
// here, instead of hardcoding the numbers it produces, is what keeps the "settled state" assertions
// below meaningful documentation of the actual math rather than brittle magic-number snapshots.
const ARC_GAP = 2
const LIT_THICKNESS = 7
const DASH_GAP_PX = 9
const MIN_DASH_ANGLE_DEG = 4

function radiusFor(size: number) {
  return size / 2 + ARC_GAP
}

// The oval every addArc call shares, per TriggerGauge's own Skia.XYWHRect(...) call.
function ovalFor(size: number) {
  const diameter = radiusFor(size) * 2
  return { x: LIT_THICKNESS / 2, y: LIT_THICKNESS / 2, width: diameter, height: diameter }
}

function totalSweepDeg(startDeg: number, endDeg: number) {
  const raw = (((endDeg - startDeg) % 360) + 360) % 360
  return raw === 0 ? 360 : raw
}

function autoDashAngleDeg(step: number, size: number) {
  const gapDeg = (DASH_GAP_PX / radiusFor(size)) * (180 / Math.PI)
  return Math.max(MIN_DASH_ANGLE_DEG, step - gapDeg)
}

function explicitDashAngleDeg(dashWidth: number, size: number) {
  return Math.max(MIN_DASH_ANGLE_DEG, (dashWidth / radiusFor(size)) * (180 / Math.PI))
}

// Segment i's center, same formula as TriggerGauge's own centerDeg/dashCenterDeg.
function centerDeg(startDeg: number, step: number, i: number) {
  return startDeg + (i + 0.5) * step
}

// The two most-recently created Skia paths -- TriggerGauge computes unlitPath then litPath on every
// render (see the source's own useDerivedValue calls, in that order), and each computation makes
// exactly one fresh Skia.Path.Make() call, so the last two Path.Make results of any settled render
// are reliably [unlit, lit].
function lastPaths() {
  const results = (Skia.Path.Make as jest.Mock).mock.results
  return {
    unlit: results[results.length - 2].value as { addArc: jest.Mock },
    lit: results[results.length - 1].value as { addArc: jest.Mock }
  }
}

const defaults: TriggerGaugeProps = { segments: 4, litIndices: [], size: 40, accentColor: '#f04', mutedColor: '#888' }

function renderGauge(props: Partial<TriggerGaugeProps> = {}) {
  return render(<TriggerGauge {...defaults} {...props} />)
}

describe('TriggerGauge', () => {
  describe('fewer than 2 segments', () => {
    it.each([0, 1])('renders nothing when segments is %d, regardless of other props', (segments) => {
      const { container } = renderGauge({ segments, litIndices: [0], dashWidth: 12, startDeg: 210, endDeg: 150 })

      expect(container.firstChild).toBeNull()
      // The real signal that TriggerGauge bailed out before its JSX return -- Canvas is a no-op
      // mock either way (see below), so firstChild alone can't distinguish the two branches.
      expect((Canvas as jest.Mock).mock.calls.length).toBe(0)
    })
  })

  describe('single-select (exactly one lit index)', () => {
    const segments = 4
    const startDeg = 180 // DEFAULT_START_DEG
    const step = totalSweepDeg(startDeg, startDeg) / segments
    const dash = autoDashAngleDeg(step, defaults.size)

    it('draws one full-width lit dash at the selected center once mounted, and retargets (not resets) to a new center when the selection changes', () => {
      const { container, rerender } = renderGauge({ segments, litIndices: [1] })

      // Canvas itself is a no-op mock (always renders null), so the DOM never gains a node even
      // once TriggerGauge reaches its real return -- container.firstChild can't be the "did it
      // actually render" signal here, only Canvas having been invoked can.
      expect(container.firstChild).toBeNull()
      expect((Canvas as jest.Mock).mock.calls.length).toBeGreaterThan(0)

      // The very first render lands mid mount-reveal (mountProgress starts at 0), so nothing is
      // drawn yet -- withTiming's mutation to mountProgress.value happens in a useLayoutEffect
      // *after* this render already ran, and doesn't itself trigger another render.
      expect(lastPaths().lit.addArc).not.toHaveBeenCalled()

      // An explicit rerender re-invokes the component, this time reading the now-settled
      // mountProgress.value === 1.
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[1]} />)
      const settledCenter = centerDeg(startDeg, step, 1) - 90 - dash / 2
      expect(lastPaths().lit.addArc).toHaveBeenCalledTimes(1)
      expect(lastPaths().lit.addArc).toHaveBeenCalledWith(ovalFor(defaults.size), expect.closeTo(settledCenter, 5), expect.closeTo(dash, 5))

      // Pick a different single option (simulating the user choosing another tier). The first
      // render after the prop change still reflects the *old* angleDeg (the retarget effect
      // mutates angleDeg.value in a useLayoutEffect that hasn't run yet when this render's
      // litPath is computed) -- so it stays at the previous center for one more pass.
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[3]} />)
      expect(lastPaths().lit.addArc).toHaveBeenCalledWith(ovalFor(defaults.size), expect.closeTo(settledCenter, 5), expect.closeTo(dash, 5))

      // One further rerender observes the retargeted angleDeg -- proving this is a genuine
      // retarget (angleDeg.value moved) rather than a snap-to-a-fixed-start-then-rotate reset.
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[3]} />)
      const newCenter = centerDeg(startDeg, step, 3) - 90 - dash / 2
      expect(newCenter).not.toBeCloseTo(settledCenter)
      expect(lastPaths().lit.addArc).toHaveBeenCalledTimes(1)
      expect(lastPaths().lit.addArc).toHaveBeenCalledWith(ovalFor(defaults.size), expect.closeTo(newCenter, 5), expect.closeTo(dash, 5))
    })
  })

  describe('multi-select (litIndices.length !== 1)', () => {
    const segments = 4

    it('mounts with nothing lit, then enters, then leaves, then no-ops on an identical rerender', () => {
      const { rerender } = renderGauge({ segments, litIndices: [] })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[]} />) // settle the mount reveal

      expect(lastPaths().lit.addArc).not.toHaveBeenCalled()
      expect(lastPaths().unlit.addArc).toHaveBeenCalledTimes(segments)

      // Entering: litIndicesKey changes, so the transition effect's setTransitionFrom (real React
      // state, unlike angleDeg's plain mutation above) forces a synchronous re-render within the
      // same act(), so this single rerender already lands on the settled "entering" state.
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[0, 1, 2]} />)
      expect(lastPaths().lit.addArc).toHaveBeenCalledTimes(3)

      // Leaving: dropping index 1 back out, keeping 0 and 2 lit throughout. Kept at 2 lit indices
      // (not 1) deliberately -- litIndices.length briefly hitting exactly 1 here would flip
      // `singleSelect` true and divert this into the angleDeg early-return branch instead of the
      // multi-select per-segment loop this test means to exercise (see the "single-select
      // recomputed per render" oddity in the final report). Index 0 and 2 stay lit (steady,
      // isLitNow === wasLit), index 1 leaves (isLitNow !== wasLit, shrinks to sweep 0), index 3
      // was never lit and never becomes lit (skipped entirely by the `!isLitNow && !wasLit`
      // guard) -- so exactly 2 addArc calls remain.
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[0, 2]} />)
      expect(lastPaths().lit.addArc).toHaveBeenCalledTimes(2)
      const callsBeforeNoop = lastPaths().lit.addArc.mock.calls

      // Rerendering with the EXACT SAME indices again means litIndicesKey === lastKeyRef.current,
      // so the transition effect's whole if-block is skipped -- nothing about the drawn arc
      // should change.
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[0, 2]} />)
      expect(lastPaths().lit.addArc).toHaveBeenCalledTimes(2)
      expect(lastPaths().lit.addArc.mock.calls).toEqual(callsBeforeNoop)
    })

    it('exercises multiple lit and multiple unlit segments in the same render (higher segment count)', () => {
      const segments = 8
      const litIndices = [0, 2, 5]
      const size = 60
      const step = totalSweepDeg(180, 180) / segments
      const dash = autoDashAngleDeg(step, size)

      const { rerender } = renderGauge({ segments, litIndices, size })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={litIndices} size={size} />)

      expect(lastPaths().unlit.addArc).toHaveBeenCalledTimes(segments - litIndices.length)
      expect(lastPaths().lit.addArc).toHaveBeenCalledTimes(litIndices.length)

      // Spot-check one lit and one unlit segment's actual center/sweep, rather than only counting.
      const litCenter = centerDeg(180, step, 2) - 90 - dash / 2
      expect(lastPaths().lit.addArc).toHaveBeenCalledWith(ovalFor(size), expect.closeTo(litCenter, 5), expect.closeTo(dash, 5))
      const unlitCenter = centerDeg(180, step, 4) - 90 - dash / 2
      expect(lastPaths().unlit.addArc).toHaveBeenCalledWith(ovalFor(size), expect.closeTo(unlitCenter, 5), expect.closeTo(dash, 5))
    })
  })

  describe('startDeg / endDeg sweep', () => {
    it('defaults to a full 360deg circle when neither is passed', () => {
      const segments = 3
      const step = totalSweepDeg(180, 180) / segments // rawSweepDeg === 0 branch -> 360
      const dash = autoDashAngleDeg(step, defaults.size)

      const { rerender } = renderGauge({ segments, litIndices: [] })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[]} />)

      expect(step).toBeCloseTo(120)
      lastPaths().unlit.addArc.mock.calls.forEach((call: unknown[]) => {
        expect(call[2]).toBeCloseTo(dash, 5)
      })
    })

    it('stays a full circle (just seamed elsewhere) when only startDeg is passed', () => {
      const segments = 3
      const startDeg = 210
      const step = totalSweepDeg(startDeg, startDeg) / segments // endDeg defaults to startDeg -> 0 -> 360

      const { rerender } = renderGauge({ segments, litIndices: [], startDeg })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[]} startDeg={startDeg} />)

      expect(step).toBeCloseTo(120)
      const center0 = centerDeg(startDeg, step, 0) - 90 - autoDashAngleDeg(step, defaults.size) / 2
      expect(lastPaths().unlit.addArc).toHaveBeenCalledWith(ovalFor(defaults.size), expect.closeTo(center0, 5), expect.anything())
    })

    it('computes a genuine partial arc (the 300deg sweep from the doc comment) when startDeg and endDeg differ', () => {
      const segments = 3
      const startDeg = 210
      const endDeg = 150
      const step = totalSweepDeg(startDeg, endDeg) / segments
      const dash = autoDashAngleDeg(step, defaults.size)

      expect(totalSweepDeg(startDeg, endDeg)).toBe(300) // the long way over the top, per the doc comment

      const { rerender } = renderGauge({ segments, litIndices: [], startDeg, endDeg })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[]} startDeg={startDeg} endDeg={endDeg} />)

      expect(lastPaths().unlit.addArc).toHaveBeenCalledTimes(segments)
      const center1 = centerDeg(startDeg, step, 1) - 90 - dash / 2
      expect(lastPaths().unlit.addArc).toHaveBeenCalledWith(ovalFor(defaults.size), expect.closeTo(center1, 5), expect.closeTo(dash, 5))
    })
  })

  describe('dashWidth', () => {
    it('auto-sizes from the segment slot minus a constant gap when omitted', () => {
      const segments = 4
      const step = totalSweepDeg(180, 180) / segments
      const dash = autoDashAngleDeg(step, defaults.size)

      const { rerender } = renderGauge({ segments, litIndices: [] })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[]} />)

      lastPaths().unlit.addArc.mock.calls.forEach((call: unknown[]) => {
        expect(call[2]).toBeCloseTo(dash, 5)
      })
    })

    it('uses a fixed px-derived angle when passed explicitly, overriding the auto-size', () => {
      const segments = 4
      const dashWidth = 5
      const dash = explicitDashAngleDeg(dashWidth, defaults.size)
      const autoDash = autoDashAngleDeg(totalSweepDeg(180, 180) / segments, defaults.size)
      expect(dash).not.toBeCloseTo(autoDash) // genuinely a different value, not silently ignored

      const { rerender } = renderGauge({ segments, litIndices: [], dashWidth })
      rerender(<TriggerGauge {...defaults} segments={segments} litIndices={[]} dashWidth={dashWidth} />)

      expect(lastPaths().unlit.addArc).toHaveBeenCalledTimes(segments)
      lastPaths().unlit.addArc.mock.calls.forEach((call: unknown[]) => {
        expect(call[2]).toBeCloseTo(dash, 5)
      })
    })
  })
})
