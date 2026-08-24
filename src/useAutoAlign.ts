import { useCallback, useEffect, useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'

// Minimum breathing room between a popover's outer edge and the screen edge — matches the general
// "don't butt content right up against the bezel" margin used elsewhere in this app.
const EDGE_MARGIN = 12

export type PopoverAlign = 'left' | 'right' | 'center'
export type PopoverVerticalAlign = 'below' | 'above'

// Measures a trigger's actual on-screen position (via measureInWindow, which resolves post-
// transform — this is what makes it correct even for a trigger sitting inside a 180°-rotated zone,
// unlike a plain onLayout which only ever reports pre-transform local coordinates) and picks
// whichever alignment keeps a popover of `contentWidth`×`contentHeight` from overflowing a screen
// edge — horizontally (left/right/center, preferring center) and vertically (below/above,
// preferring below — the usual case — but flipping to above when the trigger doesn't have enough
// room underneath it, which is what a short landscape screen with the trigger row near the top
// actually runs into).
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
export function useAutoAlign(open: boolean, contentWidth: number, contentHeight: number) {
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
    triggerRef.current?.measureInWindow((x, y, triggerWidth, triggerHeight) => {
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
  }, [contentWidth, contentHeight, windowWidth, windowHeight])

  // Re-measures whenever `open` flips true, and also if `measure` itself changes identity (i.e.
  // contentWidth/contentHeight/windowWidth/windowHeight changed) while already open — e.g. a live
  // window resize — so it never goes stale while the popover is actually showing. `measured` only
  // resets on a genuine (re)open, via the render-phase check above — not here on every re-measure,
  // so an already-visible popover never flickers hidden again just because the window resized
  // under it.
  useEffect(() => {
    if (open) measure()
  }, [open, measure])

  return { align, maxHeight, measured, triggerRef, verticalAlign }
}
