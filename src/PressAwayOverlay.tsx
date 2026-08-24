import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native'

interface Props {
  active: boolean
  onPress: () => void
  // Defaults to filling the parent entirely — pass a narrower rect (e.g. just one player's half of
  // the screen) to scope how far "away" reaches for that player's own popovers.
  style?: StyleProp<ViewStyle>
}

// Invisible full-bleed tap catcher for "press away to close." Render one per popover host (or per
// player's own screen zone — see the package README for the split-screen wiring pattern), as an
// early sibling of that zone's real content: plain paint order then keeps every real control
// directly tappable (later siblings paint on top of this), while a tap on genuinely empty space
// falls through to this and closes whatever's open. Unmounts entirely rather than always rendering
// an inert Pressable, so an idle zone never sits in the way of anything for no reason.
export function PressAwayOverlay({ active, onPress, style }: Props) {
  if (!active) return null
  return <Pressable accessibilityLabel='Dismiss' accessibilityRole='button' onPress={onPress} style={[StyleSheet.absoluteFill, style]} />
}
