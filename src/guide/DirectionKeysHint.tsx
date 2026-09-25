import { useAutoPaperTheme } from '@rific/auto-paper'
import { StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

export interface DirectionKeyLabels {
  up: string
  left: string
  down: string
  right: string
}

export type DirectionKeysAxis = 'both' | 'vertical'

export interface DirectionKeysHintProps {
  // What's printed on each cap — e.g. { up: 'W', left: 'A', down: 'S', right: 'D' }. Omit for the
  // arrow keys themselves, drawn as arrow icons (so does any single cap left out). Pass whatever the
  // seat's own key scheme actually is, not a guess: the fleet games let each seat pick WASD, arrows,
  // IJKL and so on.
  labels?: Partial<DirectionKeyLabels>
  // 'both' (default) draws the four-key inverted T. 'vertical' draws only up above down, for a game
  // whose controls only ever read those two (Pong's paddles).
  axis?: DirectionKeysAxis
  // Defaults to the theme's own primary — i.e. player 1's seat color in the fleet games.
  color?: string
}

const CAP_SIZE = 34

const ARROWS: DirectionKeyLabels = { up: 'arrow-up', left: 'arrow-left', down: 'arrow-down', right: 'arrow-right' }

function KeyCap({ label, icon, color }: { label?: string; icon: string; color: string }) {
  return (
    <View style={[styles.cap, { borderColor: color }]}>
      {label !== undefined ? (
        <Text variant='titleMedium' style={[styles.capLabel, { color }]}>
          {label}
        </Text>
      ) : (
        <Icon source={icon} size={20} color={color} />
      )}
    </View>
  )
}

// Key caps in the inverted-T every keyboard player already knows (or just up over down, see `axis`) —
// the desktop counterpart to SwipeHint for the "how do I steer" card, since a desktop browser steers by
// key, not by swipe. Plain Views, no animation, so there's nothing for reduced motion to switch off.
export function DirectionKeysHint({ labels, axis = 'both', color }: DirectionKeysHintProps) {
  const { colors } = useAutoPaperTheme()
  const tint = color ?? colors.primary

  if (axis === 'vertical') {
    const accessibilityLabel = labels?.up && labels.down ? `Keys ${labels.up} and ${labels.down}` : 'Up and down arrow keys'
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={styles.cluster}>
        <KeyCap label={labels?.up} icon={ARROWS.up} color={tint} />
        <KeyCap label={labels?.down} icon={ARROWS.down} color={tint} />
      </View>
    )
  }

  const accessibilityLabel = labels?.up && labels.left && labels.down && labels.right ? `Keys ${labels.up}, ${labels.left}, ${labels.down}, ${labels.right}` : 'Arrow keys'

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.cluster}>
      <KeyCap label={labels?.up} icon={ARROWS.up} color={tint} />
      <View style={styles.row}>
        <KeyCap label={labels?.left} icon={ARROWS.left} color={tint} />
        <KeyCap label={labels?.down} icon={ARROWS.down} color={tint} />
        <KeyCap label={labels?.right} icon={ARROWS.right} color={tint} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cap: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    height: CAP_SIZE,
    justifyContent: 'center',
    width: CAP_SIZE
  },
  capLabel: {
    fontWeight: 'bold'
  },
  cluster: {
    alignItems: 'center',
    gap: 6
  },
  row: {
    flexDirection: 'row',
    gap: 6
  }
})
