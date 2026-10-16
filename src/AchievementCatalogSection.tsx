import { getBlendedColor, useAutoPaperTheme } from '@rific/auto-paper'
import type { AchievementCatalogRow } from '@tastic/achievements'
import { Fragment } from 'react'
import { StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'

import { AchievementRow, LOCKED_BADGE_COLOR } from './AchievementRow'
import { MONO_FONT } from './fonts'

// AchievementCatalogRow now comes straight from @tastic/achievements' own getAchievementCatalogRows
// (added in the same 2026-09-18 achievements-scaffolding pass this component belongs to) - no
// longer duplicated locally now that package has actually published the export (confirmed the two
// shapes match exactly before wiring this real, type-only peer dependency).

interface Props {
  rows: AchievementCatalogRow[]
  label?: string
  // Independently optional overrides for this section's own heading/row colors - default to the
  // same useAutoPaperTheme()-derived formula as AchievementRow/StatSection/StatRow/BaseStatsScreen
  // (see BaseStatsScreen's own doc for why) when omitted, so every existing caller renders
  // identically to before. Passed straight through to each <AchievementRow>.
  fg?: string
  fgMuted?: string
}

// The "ALL ACHIEVEMENTS" heading + one <AchievementRow> per row - extracted verbatim from every
// fleet app's own achievements.tsx (Snake, AirHockey, BoxHockey, Pong, LightCycles), where this
// exact heading/list pair backed the bottom of the stats screen. Returns a Fragment, not a View:
// every existing call site rendered the heading and each row as flat siblings inside
// BaseStatsScreen's own gap-spaced ScrollView content, and wrapping them in a container here would
// change that spacing (BaseStatsScreen's own `content` style already supplies the gap between
// every child, this component included).
//
// Resolves each row's own locked-vs-unlocked badgeColor (tierColor when unlocked,
// LOCKED_BADGE_COLOR when not) here rather than upstream in row computation, matching
// AchievementRow's own "badge color is a rendering decision" doc comment - @tastic/achievements'
// (pending) getAchievementCatalogRows deliberately leaves tierColor unresolved-to-badgeColor for
// the same reason.
//
// The check mark and progress bar (AchievementRow's checkColor) are the tier color in dark mode, and
// the tier color mixed half with black in light mode. Raw gold (#FFD54F) and silver (#C0C0C8) are
// about 1.4:1 and 1.8:1 against the light screen's white, so a bar or check in either barely shows;
// mixed, they're about 5:1 and 6:1 (bronze goes from about 3:1 to 9:1). The badge keeps the true tier
// color: its glyph is black, which reads on all three.
export function AchievementCatalogSection({ rows, label = 'ALL ACHIEVEMENTS', fg, fgMuted: fgMutedOverride }: Props) {
  const { dark } = useAutoPaperTheme()
  const fgMuted = fgMutedOverride ?? (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)')
  const tierAccent = (tierColor: string) => (dark ? tierColor : getBlendedColor('#000000', tierColor, 0.5))

  return (
    <Fragment>
      <Text variant='labelMedium' style={[styles.label, { color: fgMuted, fontFamily: MONO_FONT }]}>
        {label}
      </Text>
      {rows.map((row) => (
        <AchievementRow key={row.id} icon={row.icon} title={row.title} description={row.description} badgeColor={row.unlockedAt !== undefined ? row.tierColor : LOCKED_BADGE_COLOR} checkColor={tierAccent(row.tierColor)} unlockedLabel={row.unlockedLabel} progress={row.progress} deviceMarker={row.deviceMarker} fg={fg} fgMuted={fgMutedOverride} />
      ))}
    </Fragment>
  )
}

const styles = StyleSheet.create({
  label: {
    letterSpacing: 2,
    marginTop: 8
  }
})
