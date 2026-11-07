import { getTintTextColor } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native'
import { Text } from 'react-native-paper'

import { MONO_FONT } from './fonts'

interface Props {
  color: string
  ready: boolean
  onToggleReady: () => void
  // Lets a caller fade/hide a standalone Ready button (e.g. while a popover is open elsewhere on
  // screen, so it doesn't visually collide with the popover's own positioning) without reflowing
  // layout around it - pass `{ opacity: 0, pointerEvents: 'none' }` rather than conditionally
  // unmounting.
  style?: StyleProp<ViewStyle>
  // Defaults to the system monospace font - pass your own game's registered font to match its UI.
  // The pill look (`surfaceColor`) keeps the theme's own font unless this is passed.
  labelFontFamily?: string
  // For a loadout drawn over a pack's backdrop (Solitaire on its felt), where the outline and label
  // in the seat's color read dim: Ready is then a pill on this color (the theme's surface), the size
  // and style of the seat buttons beside it (@tastic/profile's chip pill), its label black or white
  // (`dark`), and once ready it fills with `color` and its label turns to that color's own ink.
  // Unset keeps the outline on a plain black or white screen.
  surfaceColor?: string
  // Only read with `surfaceColor`: the not-ready label's white (dark) or black, as the seat buttons'.
  dark?: boolean
}

// The pill look's height and label: @tastic/profile's chip pill (a 32pt chip in 6pt of padding,
// a 13pt bold label spaced 1pt), so Ready lines up with the seat and option buttons around it.
const PILL_HEIGHT = 44

// Standalone toggle so it can render either embedded in a per-player panel or centered on its own
// below a shared row - e.g. a vs-CPU mode with only one human player needs just one Ready toggle,
// not one tucked under each slot.
export function ReadyButton({ color, ready, onToggleReady, style, labelFontFamily, surfaceColor, dark = false }: Props) {
  const label = ready ? 'READY ✓' : 'READY?'

  if (surfaceColor) {
    const pillStyle = [styles.pill, { backgroundColor: ready ? color : surfaceColor }, style]
    const pillLabelColor = ready ? getTintTextColor(color, color, 1) : dark ? '#FFFFFF' : '#000000'
    return (
      <TouchableRipple onPress={onToggleReady} borderless style={pillStyle} accessibilityRole='button' accessibilityLabel={label}>
        <Text style={[styles.pillLabel, { color: pillLabelColor }, labelFontFamily ? { fontFamily: labelFontFamily } : null]}>{label}</Text>
      </TouchableRipple>
    )
  }

  const readyButtonStyle = [styles.readyButton, { borderColor: color }, ready && { backgroundColor: color }, style]
  const labelTextStyle: TextStyle = { fontFamily: labelFontFamily ?? MONO_FONT, fontWeight: 'bold' }
  const labelColorStyle = { color: ready ? '#000000' : color }

  return (
    <TouchableRipple onPress={onToggleReady} borderless style={readyButtonStyle}>
      <Text variant='labelLarge' style={[labelTextStyle, labelColorStyle]}>
        {label}
      </Text>
    </TouchableRipple>
  )
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    borderRadius: PILL_HEIGHT / 2,
    height: PILL_HEIGHT,
    justifyContent: 'center',
    minWidth: 120,
    paddingHorizontal: 20
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  },
  readyButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 120,
    paddingHorizontal: 16,
    paddingVertical: 10
  }
})
