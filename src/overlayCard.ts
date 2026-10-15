import { StyleSheet } from 'react-native'

export interface OverlayCardColors {
  fg: string
  fgMuted: string
  cardBg: string
  cardBorder: string
}

// The old literal black/white "retro" card, the formula the fleet apps' own Game-Over/Round-Over/
// Match-Over overlays each re-derived and that this export was made to replace. hud's own cards no
// longer use it.
/**
 * @deprecated The literal black/white card colors. hud's own cards moved to the theme-driven, blur-aware
 * OverlayCard / OverlayBackdrop / useOverlayCardColors (OverlaySurface.tsx) on 2026-10-15; this stays
 * only until every app's own result cards have moved over too.
 */
export function getOverlayCardColors(dark: boolean): OverlayCardColors {
  return {
    fg: dark ? '#FFFFFF' : '#000000',
    fgMuted: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    cardBg: dark ? '#111111' : '#F2F2F2',
    cardBorder: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
  }
}

// Only the shell shape every overlay card shares (backdrop + card geometry) - deliberately not the
// title/body styling, which already legitimately varies by consumer (each app's own score/badge/zone
// content). New cards should use OverlayBackdrop and OverlayCard (OverlaySurface.tsx), which apply
// `overlay` and `card` underneath and set the theme's backdrop and border colors themselves (the
// backdrop replaces `overlay`'s rgba(0,0,0,0.72)). Only an app still on the deprecated
// getOverlayCardColors puts its cardBg and cardBorder on `card` by hand. The one button row every
// overlay card with actions shares lives in overlayActionStyles below.
export const overlayStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    maxWidth: 360,
    padding: 32
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  }
})

// The action row ConfirmDialog and guide/HowToPlayDialog share: an outlined secondary (Cancel, Skip,
// Back) on the left, a contained primary on the right, each growing to split the row but never
// narrower than 128. Moved here from ConfirmDialog when the how-to-play card needed the identical
// row, so the two can't drift into different button shapes (the guide briefly shipped text-mode
// Skip/Back - the only text buttons in the fleet).
export const overlayActionStyles = StyleSheet.create({
  // minWidth (not flexBasis) is each button's real floor - whenever both fit side by side, flexGrow
  // still splits any leftover width evenly beyond that floor, same visual result as a plain flex: 1
  // on a roomy screen, but a button can never be squeezed narrower than 128, only wrap to its own
  // row instead (see actions' flexWrap below). This used to be flexBasis: 128, which measured
  // correctly on web but rendered every button roughly SQUARE on iOS - confirmed live (see the
  // "Quit Match?" Cancel/Quit buttons and the single-button "OK" dialogs both coming out ~128pt
  // tall instead of wide). Root cause: react-native-paper's Button renders its Surface as two
  // nested views on iOS only (Surface.tsx's SurfaceIOS, for shadow rendering) - only a curated
  // allowlist of style keys (flex/flexGrow/flexShrink/width/height/position/... - notably NOT
  // flexBasis) reaches the outer view, which is the real flex item inside this row; every other
  // key, flexBasis included, falls through to an inner view whose own unspecified flexDirection
  // defaults to column. flexGrow: 1 landed on the (row-context) outer view and grew width
  // correctly; flexBasis: 128 landed on the (column-context) inner view instead, where a flexBasis
  // sets HEIGHT, not width. minWidth isn't axis-relative like flexBasis, so it constrains width
  // correctly regardless of which of the two views it ends up on. react-native-paper's Button also
  // hardcodes numberOfLines={1} on its label with no override, so a button squeezed under its
  // label's natural width silently ellipsizes ("Cancel" -> "Can...") instead of wrapping - assumed
  // fixable by just giving the row more width, until confirmed live that these two-word labels
  // (Cancel/Reset/New Game) can still lose the truncation fight even with the extra room ConfirmDialog's own
  // card width fix provides, on a narrow enough screen.
  actionButton: {
    flexGrow: 1,
    minWidth: 128
  },
  // A lone confirm button (no cancel - BaseSettingsDialog's info-only "OK" dialogs, e.g. the
  // update-check "no update found" message) has nothing left to share actions' width with, so
  // actionButton's own flexGrow: 1 would stretch it across the entire row instead of reading as a
  // normal button. Same 128 floor, no flexGrow, so it stays at that natural size instead of filling
  // the card - centered by actions' own justifyContent below.
  actionButtonSingle: {
    minWidth: 128
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    width: '100%'
  }
})
