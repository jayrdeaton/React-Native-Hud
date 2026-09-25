import { useAutoPaperTheme } from '@rific/auto-paper'
import { StyleSheet, View } from 'react-native'
import { Icon } from 'react-native-paper'

export type SeatDevice = 'keyboard' | 'mouse'

export interface SeatDevicesHintProps {
  // What each seat plays with right now, in seat order (index 0 = player 1). Map the app's own live
  // control scheme onto this: a key scheme is 'keyboard', a pointer scheme is 'mouse'.
  devices: readonly SeatDevice[]
  // Each seat's color, same order. Defaults to the theme's primary/secondary, which ARE the two seats'
  // colors in the fleet games.
  seatColors?: readonly string[]
}

const ICON: Record<SeatDevice, { source: string; size: number }> = {
  keyboard: { source: 'keyboard-outline', size: 56 },
  mouse: { source: 'mouse-outline', size: 44 }
}

const ORDER: readonly SeatDevice[] = ['keyboard', 'mouse']

// "Two players, one computer": the desktop counterpart to SeatDiagram on the two-player card. One icon
// per device the seats actually use (a keyboard if either is on keys, a mouse if either drags), each
// tinted in the color of the one seat using it, or the neutral onSurface when both share it. So the
// fleet's common default of P1 on the mouse and P2 on WASD reads as a P1-colored mouse beside a
// P2-colored keyboard, and a keys-only setup as one plain keyboard. Snake, AirHockey and Pong each drew
// their own copy of this before it existed here. Plain Icons, no animation.
export function SeatDevicesHint({ devices, seatColors }: SeatDevicesHintProps) {
  const { colors } = useAutoPaperTheme()
  const tints = seatColors ?? [colors.primary, colors.secondary]
  const accessibilityLabel = devices.map((device, i) => `Player ${i + 1} uses the ${device}`).join(', ')

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.row}>
      {ORDER.map((device) => {
        const seats = devices.flatMap((d, i) => (d === device ? [i] : []))
        if (seats.length === 0) return null
        const color = seats.length === 1 ? (tints[seats[0]] ?? colors.onSurface) : colors.onSurface
        return <Icon key={device} source={ICON[device].source} size={ICON[device].size} color={color} />
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20
  }
})
