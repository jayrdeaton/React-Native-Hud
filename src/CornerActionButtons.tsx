import { IconButton } from '@rific/feedback-press'
import { StyleSheet } from 'react-native'

interface Props {
  onBack: () => void
  onSettings: () => void
  // Full-contrast foreground — same convention as every other component keying off a `dark` prop
  // (BaseSettingsDialog, SectionedDropdown, etc.), just resolved by the caller since this component
  // never reads theme state itself.
  fg: string
  // Safe-area insets already remapped onto the screen's real visual edges (see
  // @tastic/split-screen's rotateInsets) — this component just adds the fixed 8px margin on top,
  // it doesn't know anything about physical device orientation itself.
  insets: { top: number; left: number; right: number }
}

// Back (top-left) + Settings (top-right) icon buttons, fixed at the screen's rotated corners — the
// default reachability answer for a two-player screen: correct any time both players share one
// screen but only one of them (or neither, in vs-CPU) is on the far side of a rotated zone. Not the
// right answer for a screen where the top corners themselves fall *inside* one player's own rotated
// zone (two-player face-to-face) — see SharedActionBand for that case instead, which callers select
// between based on their own game-mode/orientation state (this component has no opinion on which).
export function CornerActionButtons({ onBack, onSettings, fg, insets }: Props) {
  return (
    <>
      <IconButton icon='arrow-left' iconColor={fg} size={24} style={[styles.back, { top: 8 + insets.top, left: 8 + insets.left }]} onPress={onBack} accessibilityLabel='Back' />
      <IconButton icon='cog' iconColor={fg} size={24} style={[styles.topRight, { top: 8 + insets.top, right: 8 + insets.right }]} onPress={onSettings} accessibilityLabel='Settings' />
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
