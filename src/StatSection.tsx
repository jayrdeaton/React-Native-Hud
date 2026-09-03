import { useAutoPaperTheme } from '@rific/auto-paper'
import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

interface Props {
  label: string
  // Independently optional overrides for this section's own label color/background — default to
  // the same useAutoPaperTheme()-derived formula as StatRow/BaseStatsScreen (see BaseStatsScreen's
  // own doc for why) when omitted, so every existing caller renders identically to before.
  fg?: string
  sectionBg?: string
  children: ReactNode
}

// A labeled, tinted-background grouping box — the "OVERALL"/"VS CPU"/"ACTIVITY"-style section
// shape from LightCycles' own achievements.tsx, generalized to any content (typically a stack of
// StatRow). fg/sectionBg default to the same useAutoPaperTheme()-derived formula as
// StatRow/BaseStatsScreen (see BaseStatsScreen's own doc for why), each independently overridable
// via the matching prop for a caller with its own chrome palette. The label itself carries the
// section's own meaning (what it's a section OF), so this component has no opinion on that beyond
// rendering the string it's given.
export function StatSection({ label, fg: fgOverride, sectionBg: sectionBgOverride, children }: Props) {
  const { dark } = useAutoPaperTheme()
  const fg = fgOverride ?? (dark ? '#FFFFFF' : '#000000')
  const sectionBg = sectionBgOverride ?? (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')

  return (
    <View style={[styles.section, { backgroundColor: sectionBg }]}>
      <Text variant='labelMedium' style={[styles.label, { color: fg }]}>
        {label}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  // Bold and full-contrast (fg), not the original fontless/fgMuted treatment — that read at the
  // same visual weight as StatRow's own row labels below it (both used the identical muted color;
  // letterSpacing/variant alone didn't separate them enough to read as "this is the group header"
  // at a glance). Matches AchievementRow's own title styling (bold + fg) below it in the same list.
  label: {
    fontWeight: 'bold',
    letterSpacing: 2
  },
  section: {
    borderRadius: 12,
    gap: 8,
    padding: 16
  }
})
