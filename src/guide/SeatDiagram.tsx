import { useAutoPaperTheme } from '@rific/auto-paper'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

export interface SeatDiagramProps {
  // Default to the theme's own secondary/primary — in the fleet games those ARE the two players'
  // live seat colors, so the picture always matches whatever colors they've picked.
  topColor?: string
  bottomColor?: string
  topLabel?: string
  bottomLabel?: string
}

const DEVICE_WIDTH = 88
const DEVICE_HEIGHT = 120

// "Two players, one phone": a portrait phone split into a top half and a bottom half, each tinted in
// its own seat color, with the top label upside down the way that player actually reads it. The
// seating card every face-to-face game (LightCycles, Snake, AirHockey, BoxHockey, Pong) needs, drawn
// once. Plain Views, no animation — nothing here needs reduced-motion handling.
export function SeatDiagram({ topColor, bottomColor, topLabel = 'P2', bottomLabel = 'P1' }: SeatDiagramProps) {
  const { colors } = useAutoPaperTheme()
  const top = topColor ?? colors.secondary
  const bottom = bottomColor ?? colors.primary

  return (
    <View accessible accessibilityLabel={`${bottomLabel} plays the bottom half, ${topLabel} plays the top half`} style={[styles.device, { borderColor: colors.onSurface }]}>
      <View style={[styles.half, { borderColor: top }]}>
        <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: top }]} />
        <Text variant='titleMedium' style={[styles.label, styles.flipped, { color: top }]}>
          {topLabel}
        </Text>
      </View>
      <View style={[styles.half, styles.bottomHalf, { borderColor: bottom }]}>
        <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: bottom }]} />
        <Text variant='titleMedium' style={[styles.label, { color: bottom }]}>
          {bottomLabel}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bottomHalf: {
    borderTopWidth: 0
  },
  device: {
    borderRadius: 16,
    borderWidth: 2,
    height: DEVICE_HEIGHT,
    overflow: 'hidden',
    width: DEVICE_WIDTH
  },
  flipped: {
    transform: [{ rotate: '180deg' }]
  },
  half: {
    alignItems: 'center',
    borderWidth: 2,
    flex: 1,
    justifyContent: 'center'
  },
  label: {
    fontWeight: 'bold'
  },
  // A wash of the seat color behind its own label rather than an rgba() fill — the theme's colors
  // aren't guaranteed to be 6-digit hex, so an opacity layer is the only alpha that always works.
  tint: {
    opacity: 0.2
  }
})
