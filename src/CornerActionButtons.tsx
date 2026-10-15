import { IconButton } from '@rific/feedback-press'
import { type Insets, StyleSheet } from 'react-native'

interface Props {
  onBack: () => void
  onSettings: () => void
  // Full-contrast foreground - same convention as every other component keying off a `dark` prop
  // (BaseSettingsDialog, SectionedDropdown, etc.), just resolved by the caller since this component
  // never reads theme state itself.
  fg: string
  // Safe-area insets already remapped onto the screen's real visual edges (see
  // @tastic/split-screen's rotateInsets) - this component just adds the fixed 8px margin on top,
  // it doesn't know anything about physical device orientation itself.
  insets: { top: number; left: number; right: number }
  // Overrides the top-left button's icon (a react-native-paper/MaterialCommunityIcons name) and its
  // accessibility label - default 'arrow-left'/'Back'. Not every screen's top-left control is
  // actually "undo the last navigation": a flat menu/detail screen with nothing deeper to pop back
  // through often wants a literal home/menu affordance driving an absolute navigation instead (see
  // e.g. Solitaire's GameChrome, whose onBack navigates straight to its root route). Pass both
  // together - an icon without a matching label (or vice versa) misleads screen readers/tooltips.
  backIcon?: string
  backLabel?: string
  // Opt-in extra touch area on both buttons, forwarded as each IconButton's own hitSlop (RN's
  // number | Insets). Each button's target is its 40pt box (24pt glyph plus Paper's 8pt padding), so
  // 4 makes it 48pt. Nothing visible changes: the glyphs, the press ripple and the 8pt corner offset
  // all stay put. Needs @rific/feedback-press 0.13.0 or later, whose IconButton makes hitSlop reach
  // past Paper's clipped box; on older versions it's silently ignored. Omitted means no slop, as
  // before. The caller owns what sits near its corners, so it's the one that knows how much room
  // there is.
  hitSlop?: number | Insets
}

// Back (top-left) + Settings (top-right) icon buttons, fixed at the screen's rotated corners - the
// default reachability answer for a two-player screen: correct any time both players share one
// screen but only one of them (or neither, in vs-CPU) is on the far side of a rotated zone. Not the
// right answer for a screen where the top corners themselves fall *inside* one player's own rotated
// zone (two-player face-to-face) - see SharedActionBand for that case instead, which callers select
// between based on their own game-mode/orientation state (this component has no opinion on which).
export function CornerActionButtons({ onBack, onSettings, fg, insets, backIcon = 'arrow-left', backLabel = 'Back', hitSlop }: Props) {
  return (
    <>
      <IconButton icon={backIcon} iconColor={fg} size={24} style={[styles.back, { top: 8 + insets.top, left: 8 + insets.left }]} hitSlop={hitSlop} onPress={onBack} accessibilityLabel={backLabel} />
      <IconButton icon='cog' iconColor={fg} size={24} style={[styles.topRight, { top: 8 + insets.top, right: 8 + insets.right }]} hitSlop={hitSlop} onPress={onSettings} accessibilityLabel='Settings' />
    </>
  )
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute'
  },
  topRight: {
    position: 'absolute'
  }
})
