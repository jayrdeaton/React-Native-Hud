import { StyleSheet, View } from 'react-native'
import { Icon } from 'react-native-paper'

// Mirrors @tastic/split-screen's own type of the same name, duplicated here rather than imported —
// this package has never taken a dependency on @tastic/split-screen; every orientation/rotation-
// derived value it touches (ConfirmDialog's and BaseSettingsDialog's own `rotation` props, this
// component's orientationMode/p1OnRight below) is always a plain value the caller already resolved
// via that package's own hook, never something this package reads itself.
export type OrientationMode = 'faceToFace' | 'sideBySide'

export interface CornerStatusBadgeSeat {
  // Any react-native-paper Icon `source` name. Omit to still render the badge itself, empty — a
  // seat with nothing to show right now is different from no seat at all (see `p1`/`p2` on
  // CornerStatusBadgesProps below), and the empty badge is itself the answer ("nothing"), not a
  // reason to hide the corner.
  icon?: string
}

export interface CornerStatusBadgesProps {
  orientationMode: OrientationMode
  // Same "is this seat on the right" convention as @tastic/split-screen's own p1OnRight — only
  // meaningful when orientationMode is 'sideBySide'; ignored in 'faceToFace', where seat 1 always
  // owns the bottom half of a shared screen and seat 2 the top half, regardless of physical rotation.
  p1OnRight: boolean
  // Independently optional — omit a seat entirely to skip rendering its badge at all (e.g. a solo
  // mode with no second seat to show anything for). Pass an object (even `{}`) to render that
  // seat's badge with nothing in it.
  p1?: CornerStatusBadgeSeat
  p2?: CornerStatusBadgeSeat
}

const BADGE_SIZE = 30

// Deliberately understated (small, low-opacity, no per-seat color) — a quiet corner landmark, not
// something that should compete for attention with whatever's on screen underneath it.
function StatusBadge({ icon }: { icon?: string }) {
  return <View style={styles.badge}>{icon && <Icon source={icon} size={16} color='rgba(255,255,255,0.85)' />}</View>
}

// Generic per-seat corner status badge: at most one caller-supplied icon per seat (or none), each
// pinned to that seat's own screen corner. Has zero opinion on what the icon means — originally
// extracted from LightCycles' PowerupHud.tsx and Snake's SnakePowerupHud.tsx, which both used this
// exact positioning and styling to reveal a held power-up, but this component only ever sees a
// resolved icon name (or undefined) per seat, never the domain value behind it, so it's equally
// suited to any other per-seat status a caller wants glanceable in a screen corner (connection
// state, a turn-order marker, anything that's a single icon or nothing). Corner picked per seat
// from orientationMode/p1OnRight — the same "is this seat on the right" convention
// @tastic/split-screen's own consumers already use for zone/rotation decisions — so each badge
// always sits in that seat's own zone rather than a side fixed regardless of which way the device
// is being held. In 'faceToFace', column doesn't matter (each seat's zone spans the full width):
// seat 1 stays bottom, seat 2 stays top, regardless of p1OnRight.
export function CornerStatusBadges({ orientationMode, p1OnRight, p1, p2 }: CornerStatusBadgesProps) {
  const p1OnRightSide = orientationMode === 'sideBySide' && p1OnRight
  const p2OnLeftSide = orientationMode === 'sideBySide' && !p1OnRight
  return (
    <>
      {p1 && (
        <View pointerEvents='none' style={p1OnRightSide ? styles.bottomRight : styles.bottomLeft}>
          <StatusBadge icon={p1.icon} />
        </View>
      )}
      {p2 && (
        <View pointerEvents='none' style={p2OnLeftSide ? styles.topLeft : styles.topRight}>
          <StatusBadge icon={p2.icon} />
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 1,
    height: BADGE_SIZE,
    justifyContent: 'center',
    opacity: 0.7,
    width: BADGE_SIZE
  },
  bottomLeft: { bottom: 12, left: 12, position: 'absolute' },
  bottomRight: { bottom: 12, position: 'absolute', right: 12 },
  topLeft: { left: 12, position: 'absolute', top: 12 },
  topRight: { position: 'absolute', right: 12, top: 12 }
})
