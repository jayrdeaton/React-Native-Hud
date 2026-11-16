import { BlurView, useBlur, useBlurModule } from '@rific/auto-paper'
import { Platform, StyleSheet, View } from 'react-native'

import { useWellColors } from './wellSurface'

// Whether wells are frosted glass: while the player's Blur setting is on, in an app that handed expo-blur to auto-paper's
// Provider, and not on Android, where auto-paper's BlurView needs a blur target these wells don't have. The same rule as
// BaseSettingsDialog's Blur row, so wells frost exactly where the dialogs do (Jay, 2026-11-16: HexFleet's stats screen
// ignored Blur while its own panels frosted over the nebula).
export function useFrostedWells(): boolean {
  const blur = useBlur()
  const expoBlur = useBlurModule()
  return blur && !!expoBlur && Platform.OS !== 'android'
}

interface Props {
  // The well's corner radius, which the layer is clipped to (StatSection's and AchievementRow's are 12)
  radius?: number
  // A solid color in place of the well's own surface (a caller's sectionBg): never frosted
  color?: string
}

// A well's background (wellSurface.ts), as a layer behind its content: frosted glass over whatever is behind the screen while
// useFrostedWells() says so, and otherwise the theme's surface, the well as it always was. A layer rather than a wrapper, so the
// well keeps its own padding, shadow and layout; render it first inside a well that has no backgroundColor of its own. Apps with
// wells of their own (a game's battle cards) use it the same way. It takes no touches.
export function WellBackground({ radius = 12, color }: Props) {
  const well = useWellColors()
  const frosted = useFrostedWells() && color === undefined
  if (frosted) return <BlurView blur style={[styles.fill, { borderRadius: radius }]} />
  return <View style={[styles.fill, { backgroundColor: color ?? well.bg, borderRadius: radius }]} />
}

const styles = StyleSheet.create({
  // overflow: hidden keeps a native blur inside the rounded corners
  fill: { ...StyleSheet.absoluteFill, overflow: 'hidden', pointerEvents: 'none' }
})
