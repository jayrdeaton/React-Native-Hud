import { useAutoPaperTheme } from '@rific/auto-paper'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

interface Props {
  label: string
  value: string
}

// A single labeled stat — label on the left (muted), value on the right (bold, full-contrast).
// Extracted from LightCycles' own achievements.tsx, where this exact row shape backed every
// section (Overall/Vs CPU/Two Player/Activity). Derives its own colors from useAutoPaperTheme(),
// same as BaseStatsScreen — see that component's own doc for why a stats-screen row doesn't take
// fg/fgMuted as props. Deliberately just label+value text, not a color swatch or profile chip —
// an app needing a row with a leading visual builds its own on top of this same dark-mode formula
// (see LightCycles' own ColorStatRow/ProfileRankingRow for an example), since what that visual
// even is varies per game.
export function StatRow({ label, value }: Props) {
  const { dark } = useAutoPaperTheme()
  const fg = dark ? '#FFFFFF' : '#000000'
  const fgMuted = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

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
