import { TouchableRipple } from '@rific/feedback-press'
import { StyleProp, StyleSheet, ViewStyle } from 'react-native'
import { Text } from 'react-native-paper'

import { MONO_FONT } from './fonts'

interface Props {
  color: string
  ready: boolean
  onToggleReady: () => void
  // Lets a caller fade/hide a standalone Ready button (e.g. while a popover is open elsewhere on
  // screen, so it doesn't visually collide with the popover's own positioning) without reflowing
  // layout around it — pass `{ opacity: 0, pointerEvents: 'none' }` rather than conditionally
  // unmounting.
  style?: StyleProp<ViewStyle>
  // Defaults to the system monospace font — pass your own game's registered font to match its UI.
  labelFontFamily?: string
}

// Standalone toggle so it can render either embedded in a per-player panel or centered on its own
// below a shared row — e.g. a vs-CPU mode with only one human player needs just one Ready toggle,
// not one tucked under each slot.
export function ReadyButton({ color, ready, onToggleReady, style, labelFontFamily = MONO_FONT }: Props) {
  const readyButtonStyle = [styles.readyButton, { borderColor: color }, ready && { backgroundColor: color }, style]
  const labelTextStyle = { fontFamily: labelFontFamily, fontWeight: 'bold' }
  const labelColorStyle = { color: ready ? '#000000' : color }

  return (
    <TouchableRipple onPress={onToggleReady} borderless style={readyButtonStyle}>
      <Text variant='labelLarge' style={[labelTextStyle, labelColorStyle]}>
        {ready ? 'READY ✓' : 'READY?'}
      </Text>
    </TouchableRipple>
  )
}

const styles = StyleSheet.create({
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
