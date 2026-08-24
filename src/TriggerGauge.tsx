import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated'

export interface TriggerGaugeProps {
  // One dash per option — a single-select section's arc (grid size, speed, trail speed, CPU
  // difficulty) lights exactly one dash at the selected index; a multi-select section's (powerups)
  // lights one dash per enabled option, independently. Fewer than 2 renders nothing — a one-option
  // "choice" has nothing for an arc to distinguish.
  segments: number
  litIndices: number[]
  size: number
  accentColor: string
  mutedColor: string
  // Each dash's own arc length in px (at this gauge's radius) — how much of the arc it visually
  // covers. Omit to auto-size (see DASH_GAP_PX below) so it reads as a true dashed line — each dash
  // fills its own slot along the arc minus a small constant gap, regardless of segment count. Pass
  // an explicit px value to override that with a fixed size instead (won't auto-adjust for segment
  // count, so a large fixed value can visually merge adjacent dashes on a high-segment gauge like
  // powerups — unlike the old straight-bar version, an oversized arc here just gets long, not
  // distorted, since it's a real curve rather than an approximation of one).
  dashWidth?: number
  // Where the arc begins, in degrees clockwise from 12 o'clock (matching Skia's own angle
  // convention once shifted — see the -90° conversion below). Traversal from startDeg to endDeg is
  // always clockwise, so which of the two possible arcs (the short way or the long way around) you
  // get depends on how far clockwise endDeg sits from startDeg — swap the two values to flip
  // direction. Defaults to 6 o'clock — see endDeg for why that default is a full circle rather than
  // any particular arc.
  startDeg?: number
  // Where the arc ends — see startDeg. Defaults to whatever startDeg resolved to (its own explicit
  // value if you passed one, otherwise 6 o'clock), not some other fixed clock position — so passing
  // only startDeg still gets you a full circle, just seamed wherever you started it, rather than an
  // arbitrary partial arc between your startDeg and an unrelated default endDeg. Pass a distinct
  // endDeg to actually clamp the sweep and carve out a gap — e.g. 210 (7 o'clock) with endDeg 150
  // (5 o'clock) is a 300° arc, the long way over the top through 12, leaving a 60° gap under the
  // bottom through 6. Whenever the span is carved down from a full circle like that, it's divided
  // into exactly `segments` equal shares (see the render below) — a 2-way split gets two equal
  // shares meeting at the sweep's midpoint, a 3-way split gets three, and so on for any segment
  // count — every option gets a true, equal fraction of the visible arc. Segment order follows the
  // same clockwise sweep, so index 0 sits nearest startDeg and the last index nearest endDeg.
  endDeg?: number
}

// Stroke width for an unlit dash — thin, so it reads as a faint outline rather than competing with
// the lit one for attention.
const UNLIT_THICKNESS = 3
// Stroke width for a lit dash — noticeably thicker than UNLIT_THICKNESS, so the active option looks
// like it's actually "filled in" rather than just recolored.
const LIT_THICKNESS = 7
// Gap between consecutive dashes when auto-sizing (dashWidth omitted) — constant regardless of
// segment count, which is what keeps the arc reading as one dashed line instead of a solid merged
// ring (many segments) — sized generously so unlit and lit dashes read as clearly separate marks
// rather than blending into one ring at a glance.
const DASH_GAP_PX = 9
// Gap between the trigger's own icon circle and the arc — small, so the dashes sit close in around
// the icon rather than floating well outside its silhouette.
const ARC_GAP = 2
// Baseline for startDeg when the caller passes neither prop at all — arbitrary in principle (any
// value gives a full circle once endDeg defaults to match it, see the component signature below),
// picked as 6 o'clock so the seam sits tucked underneath the trigger rather than across its top.
const DEFAULT_START_DEG = 180 // 6 o'clock
// Floor so a many-segment gauge (or a very small dashWidth override) never collapses a dash's own
// sweep down to something too thin to register as a stroke.
const MIN_DASH_ANGLE_DEG = 4
// One-shot "gauge waking up" reveal on mount — each dash sweeps in from nothing rather than popping
// straight into existence, staggered by index so the reveal visibly travels along the arc instead of
// every dash appearing at once. Purely cosmetic, and runs once per mount only (see the effect below).
const MOUNT_DURATION_MS = 450
const MOUNT_STAGGER_MS = 40
// Selection-change transition — separate from the one-shot mount reveal above, and re-triggered
// every time litIndices actually changes after that. Quick and snappy rather than a slow drift, so
// it reads as "the gauge just updated" without making the picker feel sluggish to use.
const SELECTION_TRANSITION_DURATION_MS = 260

// Arc of dashes drawn around a SectionedDropdown trigger, purely decorative-informational — the
// trigger's own icon stays exactly as it is (see SectionedDropdown's triggerIcon), this just frames
// it with an at-a-glance read of *which* option is active without opening the popover. Each dash is
// a real Skia arc segment (Path.addArc), not a straight bar approximating one — a straight bar wide
// enough to look bold started visibly crossing its neighbors on a sparse (e.g. 3-option) gauge,
// since a chord that long diverges a lot from the circle it's meant to trace; an actual arc stays on
// the circle at any width. Skia measures angles clockwise from 3 o'clock, so a center angle here
// (measured clockwise from 12, like startDeg/endDeg) is shifted by -90° before being handed to
// addArc.
export function TriggerGauge({ segments, litIndices, size, accentColor, mutedColor, dashWidth, startDeg = DEFAULT_START_DEG, endDeg = startDeg }: TriggerGaugeProps) {
  // Every hook below runs unconditionally, ahead of the segments<2 bail-out further down (rules of
  // hooks) — harmless when it fires, since the resulting paths just never get read.
  const totalDurationMs = MOUNT_DURATION_MS + Math.max(0, segments - 1) * MOUNT_STAGGER_MS
  const mountProgress = useSharedValue(0)
  useLayoutEffect(() => {
    mountProgress.value = withTiming(1, { duration: totalDurationMs, easing: Easing.out(Easing.cubic) })
    // Runs once per mount only — a "the gauge just appeared" cue, not tied to which option is
    // selected, so this deliberately ignores changes to props that follow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clockwise distance from startDeg to endDeg — e.g. 210 (7 o'clock) to 150 (5 o'clock) is 300°,
  // the long way over the top, not the 60° short way under the bottom that a naive `endDeg -
  // startDeg` would give as a negative number whenever endDeg is numerically smaller. Divided evenly
  // across every segment (not every *gap* between segments — see step below) so each option gets a
  // true equal fraction of the visible arc regardless of segment count, which is what actually keeps
  // a 2-segment gauge from reading differently proportioned than a 3- or 4-segment one. The %360
  // double-mod can't distinguish "0° apart" from "360° apart" (both reduce to 0), and a 0° sweep is
  // never a useful gauge — every dash would collapse onto the same point — so a 0 result is treated
  // as the far more likely intent, a full unbroken circle, rather than a degenerate one.
  const rawSweepDeg = (((endDeg - startDeg) % 360) + 360) % 360
  const totalSweepDeg = rawSweepDeg === 0 ? 360 : rawSweepDeg
  // Each segment's own angular share of totalSweepDeg — doubles as both "this dash's width before
  // the gap is subtracted" (see autoDashAngleDeg below) and "the spacing between consecutive
  // centers" (see centerDeg), since a set of equal, contiguous shares naturally has both properties
  // at once.
  const step = segments > 0 ? totalSweepDeg / segments : 0
  // Segment i's own center sits half a share clockwise from startDeg, then a further whole share per
  // preceding index — i.e. the middle of the i-th equal slice, not at either of its edges. Segment
  // 0 is the first slice *after* startDeg (never sits exactly on startDeg itself), and the last
  // segment's slice ends exactly on endDeg. Index increases clockwise — left to right across the
  // top — matching normal reading order.
  const centerDeg = useCallback((i: number) => startDeg + (i + 0.5) * step, [startDeg, step])
  // A single-select trigger (grid size, speed, trail speed, CPU difficulty) always has exactly one
  // lit index — a multi-select one (powerups) can have any count, including exactly 1, so this is a
  // structural property of which *kind* of section this gauge belongs to, not something that flips
  // render to render in practice.
  const singleSelect = litIndices.length === 1

  // The lit arc's own center angle, for the singleSelect case — tracked continuously rather than
  // computed fresh from a "from index" + 0..1 progress pair, specifically so a rapid follow-up
  // selection can *retarget* an already-in-flight rotation instead of snapping to a fixed start
  // angle first. withTiming does this automatically when you assign a new target to a shared value
  // that's already mid-animation: it interpolates from wherever the value actually is right now, not
  // from the animation's original start point. Resetting the value before restarting the animation
  // (this file's own previous approach) throws that away — every follow-up transition would snap the
  // arc to the *previous* transition's fixed departure angle before rotating on, which read as a
  // glitch/teleport on anything but the very first change. Initial value is set directly, before any
  // animation exists, so the very first mount doesn't rotate in from nowhere — see the mount reveal
  // (sweep width, not angle) above for that.
  const angleDeg = useSharedValue(centerDeg(litIndices[0] ?? 0))

  // Selection-change transition state, used only for the multi-select (non-singleSelect) case now —
  // singleSelect handles its own transition via angleDeg above. `transitionFrom` is whatever was lit
  // just before the most recent change — detected by comparing litIndicesKey against lastKeyRef,
  // which trails one change behind (see lastIndicesRef.current below). This lives in
  // useLayoutEffect rather than a plain useEffect specifically so it fires — and, since
  // setTransitionFrom during it triggers a synchronous re-render, *resolves* — before the browser
  // ever paints the frame it was scheduled from: a plain useEffect can run after paint, letting React
  // commit one real frame with the new litIndices against the still-stale transitionFrom/
  // selectionProgress first, which reads as a flash. Refs, not state, for the tracking itself —
  // react-hooks/refs correctly flags reading or writing a ref during the render body (a discarded/
  // replayed render can leave a ref mutated without ever committing, corrupting this tracking in a
  // way that reproduces intermittently rather than every time), so this all needs to live inside an
  // effect, not inline in the component body. The very first mount never triggers this: lastKeyRef/
  // transitionFrom's own initial state start out equal to the first litIndices this instance ever
  // sees, so mount's own reveal is entirely mountProgress's job, not this one's.
  const litIndicesKey = [...litIndices].sort((a, b) => a - b).join(',')
  const [transitionFrom, setTransitionFrom] = useState(litIndices)
  const transitionFromKey = [...transitionFrom].sort((a, b) => a - b).join(',')
  const lastKeyRef = useRef(litIndicesKey)
  const lastIndicesRef = useRef(litIndices)
  const selectionProgress = useSharedValue(1)
  useLayoutEffect(() => {
    if (litIndicesKey !== lastKeyRef.current) {
      if (singleSelect && lastIndicesRef.current.length === 1) {
        angleDeg.value = withTiming(centerDeg(litIndices[0]), { duration: SELECTION_TRANSITION_DURATION_MS, easing: Easing.out(Easing.cubic) })
      } else {
        setTransitionFrom(lastIndicesRef.current)
        selectionProgress.value = 0
        selectionProgress.value = withTiming(1, { duration: SELECTION_TRANSITION_DURATION_MS, easing: Easing.out(Easing.cubic) })
      }
      lastKeyRef.current = litIndicesKey
    }
    lastIndicesRef.current = litIndices
  }, [litIndicesKey, litIndices, selectionProgress, angleDeg, singleSelect, centerDeg])

  const radius = size / 2 + ARC_GAP
  // step is always >= 0 now (totalSweepDeg's double-mod guarantees it, unlike the old signed
  // sweepDeg this replaced), so this no longer needs Math.abs — kept as its own name rather than
  // reusing `step` directly since this one specifically means "before the gap is subtracted."
  const slotDeg = step
  // A px gap converted to degrees at this radius (arc length = radius * angleInRadians), so the gap
  // between dashes reads as visually constant regardless of radius or segment count.
  const gapDeg = (DASH_GAP_PX / radius) * (180 / Math.PI)
  // No upper clamp: each dash fills its own equal slot minus the constant gap, whatever that share
  // works out to be, so a 2-segment gauge tiles as fully as a 4-segment one instead of stopping at
  // some fixed width and leaving the rest of a large share visibly empty (that mismatch is exactly
  // what a fixed ceiling used to cause — same segment count, same full circle, but only some of
  // them read as "divided all the way around" and others didn't).
  const autoDashAngleDeg = Math.max(MIN_DASH_ANGLE_DEG, slotDeg - gapDeg)
  const dashAngleDeg = dashWidth != null ? Math.max(MIN_DASH_ANGLE_DEG, (dashWidth / radius) * (180 / Math.PI)) : autoDashAngleDeg

  const diameter = radius * 2
  // LIT_THICKNESS/2 padding on every side (the thicker of the two strokes) so a full-width stroke
  // never clips at the canvas edge.
  const canvasSize = diameter + LIT_THICKNESS
  const oval = Skia.XYWHRect(LIT_THICKNESS / 2, LIT_THICKNESS / 2, diameter, diameter)

  // One combined path per style group (lit vs unlit) rather than one path per dash — a Path strokes
  // as a single color/width, so dashes sharing a style share a path; this also keeps the number of
  // useDerivedValue calls fixed at two regardless of segment count, which a per-dash hook would
  // violate (hook counts can't vary across renders). Always reflects the FINAL/target litIndices,
  // dim — including whatever's mid-"leaving" in litPath below, so the dim base is already sitting
  // there the instant a lit dash starts shrinking off of it, rather than popping in only once the
  // shrink finishes.
  const unlitPath = useDerivedValue(() => {
    const path = Skia.Path.Make()
    for (let i = 0; i < segments; i++) {
      if (litIndices.includes(i)) continue
      let local = 1
      if (mountProgress.value < 1) {
        const startFrac = (i * MOUNT_STAGGER_MS) / totalDurationMs
        const endFrac = startFrac + MOUNT_DURATION_MS / totalDurationMs
        local = Math.min(1, Math.max(0, (mountProgress.value - startFrac) / (endFrac - startFrac)))
      }
      const sweep = dashAngleDeg * local
      if (sweep <= 0) continue
      // Recomputed inline (not calling the outer centerDeg helper) — this runs inside a
      // useDerivedValue worklet, and the helper above is a plain JS closure, not itself workletized.
      const dashCenterDeg = startDeg + (i + 0.5) * step
      path.addArc(oval, dashCenterDeg - 90 - sweep / 2, sweep)
    }
    return path
    // litIndicesKey, not litIndices — the array itself is a brand-new reference on every render
    // (including ones triggered by a totally unrelated sibling gauge or settings field), which would
    // otherwise force this worklet to rebuild on every such render. The stable string key only
    // actually changes when the *content* does, so an unrelated re-render leaves the already-running
    // animation alone instead of restarting/glitching it.
  }, [segments, litIndicesKey, step, startDeg, dashAngleDeg, totalDurationMs, oval.x, oval.y, oval.width, oval.height])

  const litPath = useDerivedValue(() => {
    const path = Skia.Path.Make()
    // The common case — a single-select trigger swapping from one tier to another — is just one
    // full-width arc sitting at angleDeg's current value, which useLayoutEffect above retargets
    // (never resets) on every change; this alone gives a real rotating handoff, including smoothly
    // redirecting mid-rotation if another change interrupts it. Only reached once the mount reveal
    // is done — before that, the sweep-width stagger below owns the reveal instead.
    if (mountProgress.value >= 1 && singleSelect) {
      path.addArc(oval, angleDeg.value - 90 - dashAngleDeg / 2, dashAngleDeg)
      return path
    }

    for (let i = 0; i < segments; i++) {
      const isLitNow = litIndices.includes(i)
      const wasLit = transitionFrom.includes(i)
      if (!isLitNow && !wasLit) continue
      let local
      if (mountProgress.value < 1) {
        if (!isLitNow) continue
        const startFrac = (i * MOUNT_STAGGER_MS) / totalDurationMs
        const endFrac = startFrac + MOUNT_DURATION_MS / totalDurationMs
        local = Math.min(1, Math.max(0, (mountProgress.value - startFrac) / (endFrac - startFrac)))
      } else if (isLitNow === wasLit) {
        local = 1 // steady — lit before and after (or the mount-only branch above already handled unlit)
      } else if (isLitNow) {
        local = selectionProgress.value // entering — grows in
      } else {
        local = 1 - selectionProgress.value // leaving — shrinks away
      }
      const sweep = dashAngleDeg * local
      if (sweep <= 0) continue
      // Recomputed inline (not calling the outer centerDeg helper) — this runs inside a
      // useDerivedValue worklet, and the helper above is a plain JS closure, not itself workletized.
      const dashCenterDeg = startDeg + (i + 0.5) * step
      path.addArc(oval, dashCenterDeg - 90 - sweep / 2, sweep)
    }
    return path
    // litIndicesKey/transitionFromKey, not the arrays themselves — see unlitPath's identical comment.
  }, [segments, litIndicesKey, transitionFromKey, singleSelect, step, startDeg, dashAngleDeg, totalDurationMs, oval.x, oval.y, oval.width, oval.height])

  if (segments < 2) return null

  const gaugeSizeStyle = {
    height: size,
    width: size
  }
  const canvasSizeStyle = {
    height: canvasSize,
    width: canvasSize
  }

  return (
    <View style={[styles.container, gaugeSizeStyle]} pointerEvents='none'>
      <Canvas style={canvasSizeStyle}>
        <Path path={unlitPath} style='stroke' strokeWidth={UNLIT_THICKNESS} strokeCap='round' color={mutedColor} opacity={0.35} />
        <Path path={litPath} style='stroke' strokeWidth={LIT_THICKNESS} strokeCap='round' color={accentColor} opacity={1} />
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute'
  }
})
