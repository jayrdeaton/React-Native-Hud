import { type ComponentRef, RefObject, useEffect, useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'

// Minimum breathing room between a popover's outer edge and the screen edge - matches the general
// "don't butt content right up against the bezel" margin used elsewhere in this app.
const EDGE_MARGIN = 12

// The edges a popover has room up to: the window's, or a bounds view's (see useAutoAlign).
interface Limits {
  left: number
  top: number
  right: number
  bottom: number
}

export type PopoverAlign = 'left' | 'right' | 'center'
export type PopoverVerticalAlign = 'below' | 'above'

// Same shape useAutoAlign itself returns - exported so a caller can substitute this package's own
// plain, screen-edge-aware placement wholesale via a component's own `alignOverride` prop (see
// LabeledDropdown's, SectionedDropdown's, and InlineColorPicker's own `alignOverride`), most often
// with useZoneClampedAlign's result for a popover living inside a @tastic/split-screen zone, where
// the plain window-relative decision can pick a direction that overflows into the shared row
// instead of the zone's own boundary. Hand-declared rather than `ReturnType<typeof useAutoAlign>`
// so this stays a stable, self-documented public type regardless of useAutoAlign's own internal
// implementation shape.
export interface AlignResult {
  align: PopoverAlign
  verticalAlign: PopoverVerticalAlign
  maxHeight: number
  measured: boolean
  triggerRef: RefObject<ViewInstance | null>
}

// What a ref on a View holds. React Native 0.88's strict types make View a function, so a bare
// `RefObject<View>` there names a ref to the function itself, with no measureInWindow; this is the
// instance in both its legacy and strict types.
export type ViewInstance = ComponentRef<typeof View>

// Measures a trigger's on-screen position (via measureInWindow) and picks whichever alignment keeps
// a popover of `contentWidth`×`contentHeight` from overflowing a screen edge - horizontally
// (left/right/center, preferring center) and vertically (below/above, preferring below - the usual
// case - but flipping to above when the trigger doesn't have enough room underneath it, which is
// what a short landscape screen with the trigger row near the top actually runs into).
//
// measureInWindow resolves the trigger's PRE-transform layout frame - confirmed against a real
// rotated screen, not just reasoned about (an earlier version of this comment claimed the opposite,
// which let a real bug ship unnoticed). Up to 0.33 a `rotation` argument reflected that frame back
// for a trigger inside an ancestor turned by @tastic/core's drawn rotation; the OS turns the screen
// since core 0.15, nothing passed one any more, and it went in 0.34, so the raw measurement is used
// as is.
//
// Also returns `maxHeight`: the actual room available in whichever vertical direction got picked.
// Flipping above-vs-below only ever picks the *better* side - on a screen short enough that neither
// side has room for the whole thing (the same landscape case, just more cramped), that's still not
// enough on its own. The caller is expected to cap its content to this and let it scroll instead of
// silently overflowing past the screen edge - this hook only decides where the popover opens, not
// how its content copes with running out of room, since that's presentation-specific (a menu scrolls
// its rows; other content might reasonably do something else).
//
// Re-measures on every open (not continuously) - the trigger's screen position can't change while
// its own popover is showing anyway, so there's nothing to gain from tracking it beyond that.
//
// `bounds` is a View the popover can't leave, when that's narrower or shorter than the window: a
// scroll view the trigger sits in clips its popover at the scroll view's edges, so a popover
// centred against the window can be cut off by a column narrower than it (a roster capped to a
// column in a wide window). With it the room on every side is measured to the bounds' edges
// instead of the window's (measured the same way as the trigger). Omit it for the
// window, as before.
// Annotated as AlignResult rather than inferred: the declaration build prints an inferred ref type
// with the legacy types' name for it (`RefObject<View>`), which the strict types read as a ref to
// the View function.
export function useAutoAlign(open: boolean, contentWidth: number, contentHeight: number, bounds?: RefObject<ViewInstance | null>): AlignResult {
  const triggerRef = useRef<ViewInstance>(null)
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const [align, setAlign] = useState<PopoverAlign>('center')
  const [verticalAlign, setVerticalAlign] = useState<PopoverVerticalAlign>('below')
  const [maxHeight, setMaxHeight] = useState<number>(contentHeight)
  // False from the instant `open` goes true until this open's own measurement actually lands -
  // measureInWindow resolves via a native callback, not synchronously, so there's a real gap where
  // `align`/`verticalAlign` still hold whatever a *previous* open last measured (or the plain
  // 'center'/'below' guess, the very first time). Left ungated, the popover would mount and paint at
  // that stale/guessed position for one frame, then visibly jump the instant the real measurement
  // lands - the caller is expected to hold the popover itself hidden (not just unmeasured content)
  // until this flips true, which is what actually avoids the flash rather than just relocating it.
  const [measured, setMeasured] = useState(false)
  // Detects the false->true edge of `open` *during render* (React's "adjusting state during render"
  // pattern) rather than in the effect below, specifically so `measured` is already false by the
  // time this same render commits - an effect-based reset would still let one frame paint at the
  // stale/guessed alignment before the reset (and the eventual re-measurement) caught up.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMeasured(false)
  }

  // Re-measures whenever `open` flips true, and also if the content size, the window or the bounds
  // change while already open - e.g. a live window resize, or the device being physically
  // turned while the popover is showing - so it never goes stale while the popover is actually
  // showing. `measured` only resets on a genuine (re)open, via the render-phase check above - not here
  // on every re-measure, so an already-visible popover never flickers hidden again just because the
  // window resized (or rotated) under it. (The measurement lives in the effect itself, not a
  // useCallback, so the bounds view is read when it runs.)
  useEffect(() => {
    if (!open) return
    const place = (limits: Limits) => (x: number, y: number, triggerWidth: number, triggerHeight: number) => {
      const centerX = x + triggerWidth / 2
      const overflowsRight = centerX + contentWidth / 2 > limits.right - EDGE_MARGIN
      const overflowsLeft = centerX - contentWidth / 2 < limits.left + EDGE_MARGIN
      // Both directions overflowing means the popover is simply wider than the screen has room for
      // either way - 'center' is the least-bad choice there (symmetric clipping beats asymmetric).
      if (overflowsRight && !overflowsLeft) setAlign('right')
      else if (overflowsLeft && !overflowsRight) setAlign('left')
      else setAlign('center')

      // Below is the default/preferred direction - only flips to above when there's genuinely more
      // room that way, not merely whenever below is imperfect, so a popover close to fitting either
      // way doesn't flip-flop from a one-pixel margin difference.
      const roomBelow = limits.bottom - (y + triggerHeight) - EDGE_MARGIN
      const roomAbove = y - limits.top - EDGE_MARGIN
      const above = contentHeight > roomBelow && roomAbove > roomBelow
      setVerticalAlign(above ? 'above' : 'below')
      setMaxHeight(Math.max(above ? roomAbove : roomBelow, 0))
      setMeasured(true)
    }
    const screen: Limits = { left: 0, top: 0, right: windowWidth, bottom: windowHeight }
    const boundsView = bounds?.current
    if (!boundsView) {
      triggerRef.current?.measureInWindow(place(screen))
      return
    }
    boundsView.measureInWindow((x, y, width, height) => {
      // Kept inside the window: a bounds view running past it doesn't make room past the screen.
      triggerRef.current?.measureInWindow(place({ left: Math.max(x, 0), top: Math.max(y, 0), right: Math.min(x + width, windowWidth), bottom: Math.min(y + height, windowHeight) }))
    })
  }, [open, contentWidth, contentHeight, windowWidth, windowHeight, bounds])

  return { align, maxHeight, measured, triggerRef, verticalAlign }
}
