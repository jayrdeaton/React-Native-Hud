import { useAutoPaperTheme } from '@rific/auto-paper'
import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

interface Props {
  label: string
  children: ReactNode
}

// A labeled, tinted-background grouping box — the "OVERALL"/"VS CPU"/"ACTIVITY"-style section
// shape from LightCycles' own achievements.tsx, generalized to any content (typically a stack of
// StatRow). Derives its own colors from useAutoPaperTheme(), same as StatRow/BaseStatsScreen — see
// BaseStatsScreen's own doc for why. The label itself carries the section's own meaning (what it's
// a section OF), so this component has no opinion on that beyond rendering the string it's given.
export function StatSection({ label, children }: Props) {
  const { dark } = useAutoPaperTheme()
  const fgMuted = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const sectionBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  return (
    <View style={[styles.section, { backgroundColor: sectionBg }]}>
      <Text variant='labelMedium' style={[styles.label, { color: fgMuted }]}>
        {label}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    letterSpacing: 2
  },
  section: {
    borderRadius: 12,
    gap: 8,
    padding: 16
  }
})
