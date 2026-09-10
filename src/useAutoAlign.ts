import { type ViewRotation } from '@tastic/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'

// Minimum breathing room between a popover's outer edge and the screen edge — matches the general
// "don't butt content right up against the bezel" margin used elsewhere in this app.
const EDGE_MARGIN = 12

export type PopoverAlign = 'left' | 'right' | 'center'
export type PopoverVerticalAlign = 'below' | 'above'
// Same set of values as @tastic/core's own ViewRotation — re-exported under this package's existing
// name rather than switching every call site to import ViewRotation directly, since "popover
// rotation" reads clearer at these call sites than the more general core name.
export type PopoverRotation = ViewRotation

// Reflects a rect from the PRE-rotation layout frame measureInWindow actually reports (see
// useAutoAlign's own comment below for why that's what it reports, not the post-rotation visual
// position) into its true, post-rotation position — needed for a trigger sitting inside a
// @tastic/split-screen-style FakeLandscapeView, or any other ancestor rotated the same way (a bare
// CSS `transform: rotate()`, not an actual OS-level orientation change).
//
// The pivot is always the window's own center, for every rotation amount: FakeLandscapeView (and
// this package's own doc-recommended equivalent for a caller that rolls its own) always centers its
// rotated container — width/height swapped first for ±90°, unchanged for 180° — within the original,
// un-rotated screen bounds before applying the CSS rotation, so the transform's own effective pivot
// lands at that shared center regardless of which of the three non-zero rotations it is.
export function rotateRect(x: number, y: number, width: number, height: number, rotation: PopoverRotation, windowWidth: number, windowHeight: number): { x: number; y: number; width: number; height: number } {
  if (rotation === 0) return { x, y, width, height }
  const cx = windowWidth / 2
  const cy = windowHeight / 2
  const dx = x + width / 2 - cx
  const dy = y + height / 2 - cy
  // Clockwise-positive about (cx, cy) — matches CSS's own rotate(deg) sign convention, which is
  // where every rotation value this ever receives ultimately comes from (getViewRotation and
  // FakeLandscapeView both already commit to that same convention).
  const [newDx, newDy, newWidth, newHeight] = rotation === 180 ? [-dx, -dy, width, height] : rotation === 90 ? [-dy, dx, height, width] : [dy, -dx, height, width]
  return { x: cx + newDx - newWidth / 2, y: cy + newDy - newHeight / 2, width: newWidth, height: newHeight }
}

// Measures a trigger's on-screen position (via measureInWindow) and picks whichever alignment keeps
// a popover of `contentWidth`×`contentHeight` from overflowing a screen edge — horizontally
// (left/right/center, preferring center) and vertically (below/above, preferring below — the usual
// case — but flipping to above when the trigger doesn't have enough room underneath it, which is
// what a short landscape screen with the trigger row near the top actually runs into).
//
// measureInWindow resolves the trigger's PRE-transform layout frame — confirmed against a real
// rotated screen, not just reasoned about: an earlier version of this comment claimed the opposite
// (that measureInWindow "resolves post-transform"), which is what let a real bug ship unnoticed,
// since nothing here ever actually exercised a rotated case to catch that claim being wrong (see
// this file's own test suite, which now does). A plain `onLayout` reports the same pre-transform
// frame — there is no plain RN layout API that reports a transformed descendant's true visual
// position, which is exactly why `rotation` below exists: it's the one piece of information this
// hook cannot recover from measurement alone, since Yoga's layout pass and a CSS `transform` are
// deliberately independent stages, so the caller has to supply it.
//
// `rotation` defaults to 0 (measureInWindow's raw result used as-is) — every existing caller that
// never sits inside a rotated ancestor keeps behaving identically; only a caller that both (a) can
// end up inside a @tastic/split-screen-style rotated zone and (b) knows which rotation is currently
// live needs to pass it (see SectionedDropdown's own `rotation` prop for the wiring this expects).
//
// Also returns `maxHeight`: the actual room available in whichever vertical direction got picked.
// Flipping above-vs-below only ever picks the *better* side — on a screen short enough that neither
// side has room for the whole thing (the same landscape case, just more cramped), that's still not
// enough on its own. The caller is expected to cap its content to this and let it scroll instead of
// silently overflowing past the screen edge — this hook only decides where the popover opens, not
// how its content copes with running out of room, since that's presentation-specific (a menu scrolls
// its rows; other content might reasonably do something else).
//
// Re-measures on every open (not continuously) — the trigger's screen position can't change while
// its own popover is showing anyway, so there's nothing to gain from tracking it beyond that.
export function useAutoAlign(open: boolean, contentWidth: number, contentHeight: number, rotation: PopoverRotation = 0) {
  const triggerRef = useRef<View>(null)
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const [align, setAlign] = useState<PopoverAlign>('center')
  const [verticalAlign, setVerticalAlign] = useState<PopoverVerticalAlign>('below')
  const [maxHeight, setMaxHeight] = useState<number>(contentHeight)
  // False from the instant `open` goes true until this open's own measurement actually lands —
  // measureInWindow resolves via a native callback, not synchronously, so there's a real gap where
  // `align`/`verticalAlign` still hold whatever a *previous* open last measured (or the plain
  // 'center'/'below' guess, the very first time). Left ungated, the popover would mount and paint at
  // that stale/guessed position for one frame, then visibly jump the instant the real measurement
  // lands — the caller is expected to hold the popover itself hidden (not just unmeasured content)
  // until this flips true, which is what actually avoids the flash rather than just relocating it.
  const [measured, setMeasured] = useState(false)
  // Detects the false->true edge of `open` *during render* (React's "adjusting state during render"
  // pattern) rather than in the effect below, specifically so `measured` is already false by the
  // time this same render commits — an effect-based reset would still let one frame paint at the
  // stale/guessed alignment before the reset (and the eventual re-measurement) caught up.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMeasured(false)
  }

  const measure = useCallback(() => {
    triggerRef.current?.measureInWindow((rawX, rawY, rawWidth, rawHeight) => {
      const { x, y, width: triggerWidth, height: triggerHeight } = rotateRect(rawX, rawY, rawWidth, rawHeight, rotation, windowWidth, windowHeight)
      const centerX = x + triggerWidth / 2
      const overflowsRight = centerX + contentWidth / 2 > windowWidth - EDGE_MARGIN
      const overflowsLeft = centerX - contentWidth / 2 < EDGE_MARGIN
      // Both directions overflowing means the popover is simply wider than the screen has room for
      // either way — 'center' is the least-bad choice there (symmetric clipping beats asymmetric).
      if (overflowsRight && !overflowsLeft) setAlign('right')
      else if (overflowsLeft && !overflowsRight) setAlign('left')
      else setAlign('center')

      // Below is the default/preferred direction — only flips to above when there's genuinely more
      // room that way, not merely whenever below is imperfect, so a popover close to fitting either
      // way doesn't flip-flop from a one-pixel margin difference.
      const roomBelow = windowHeight - (y + triggerHeight) - EDGE_MARGIN
      const roomAbove = y - EDGE_MARGIN
      const above = contentHeight > roomBelow && roomAbove > roomBelow
      setVerticalAlign(above ? 'above' : 'below')
      setMaxHeight(Math.max(above ? roomAbove : roomBelow, 0))
      setMeasured(true)
    })
  }, [contentWidth, contentHeight, windowWidth, windowHeight, rotation])

  // Re-measures whenever `open` flips true, and also if `measure` itself changes identity (i.e.
  // contentWidth/contentHeight/windowWidth/windowHeight/rotation changed) while already open — e.g.
  // a live window resize, or the device being physically turned while the popover is showing — so it
  // never goes stale while the popover is actually showing. `measured` only resets on a genuine
  // (re)open, via the render-phase check above — not here on every re-measure, so an already-visible
  // popover never flickers hidden again just because the window resized (or rotated) under it.
  useEffect(() => {
    if (open) measure()
  }, [open, measure])

  return { align, maxHeight, measured, triggerRef, verticalAlign }
}
