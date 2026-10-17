import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { useWellColors, WELL_SHADOW } from './wellSurface'

interface Props {
  label: string
  // Independently optional overrides for this section's own label color/background - default to the well's
  // (wellSurface.ts: the theme's surface and its onSurface text).
  fg?: string
  sectionBg?: string
  children: ReactNode
}

// A labeled grouping box, a well (wellSurface.ts: the theme's surface on MD3's level-1 shadow) - the
// "OVERALL"/"VS CPU"/"ACTIVITY"-style section shape from LightCycles' own achievements.tsx, generalized to any
// content (typically a stack of StatRow). fg/sectionBg default to the well's colors, each independently
// overridable via the matching prop for a caller with its own chrome palette. It was a faint tint until
// 2026-10-17 (6% white in dark mode, 4% black in light). The label itself carries the section's own meaning
// (what it's a section OF), so this component has no opinion on that beyond rendering the string it's given.
export function StatSection({ label, fg: fgOverride, sectionBg: sectionBgOverride, children }: Props) {
  const well = useWellColors()
  const fg = fgOverride ?? well.fg
  const sectionBg = sectionBgOverride ?? well.bg

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
  // Bold and full-contrast (fg), not the original fontless/fgMuted treatment - that read at the
  // same visual weight as StatRow's own row labels below it (both used the identical muted color;
  // letterSpacing/variant alone didn't separate them enough to read as "this is the group header"
  // at a glance). Matches AchievementRow's own title styling (bold + fg) below it in the same list.
  label: {
    fontWeight: 'bold',
    letterSpacing: 2
  },
  section: {
    borderRadius: 12,
    boxShadow: WELL_SHADOW,
    gap: 8,
    padding: 16
  }
})
