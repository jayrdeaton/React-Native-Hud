import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useWellColors } from './wellSurface'

interface Props {
  label: string
  value: string
  // Independently optional overrides for this row's own text colors - default to the text colors of the well it
  // sits in (wellSurface.ts: onSurface, onSurfaceVariant).
  fg?: string
  fgMuted?: string
}

// A single labeled stat - label on the left (muted), value on the right (bold, full-contrast).
// Extracted from LightCycles' own achievements.tsx, where this exact row shape backed every
// section (Overall/Vs CPU/Two Player/Activity). fg/fgMuted default to the text colors of the StatSection well it
// sits in, each independently overridable via the matching prop for a caller with its own chrome palette.
// Deliberately just label+value text, not a color swatch or profile chip - an app needing a row
// with a leading visual builds its own on top of the same useWellColors() (see LightCycles' own
// ColorStatRow/ProfileRankingRow for an example), since what that visual even is varies per game.
export function StatRow({ label, value, fg: fgOverride, fgMuted: fgMutedOverride }: Props) {
  const well = useWellColors()
  const fg = fgOverride ?? well.fg
  const fgMuted = fgMutedOverride ?? well.fgMuted

  return (
    <View style={styles.row}>
      <Text variant='bodyMedium' style={{ color: fgMuted }}>
        {label}
      </Text>
      <Text variant='bodyMedium' style={[styles.value, { color: fg }]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  value: {
    fontWeight: 'bold'
  }
})
