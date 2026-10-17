import { StatRow } from './StatRow'
import { StatSection } from './StatSection'

interface ActivityStats {
  distinctDaysPlayed: number
  currentDayStreak: number
  bestDayStreak: number
}

interface Props {
  stats: ActivityStats
  // Optional overrides for the section's and its rows' colors, passed straight through to StatSection and each
  // StatRow (whose own defaults are the well's, see wellSurface.ts) - for a caller with its own chrome palette.
  fg?: string
  fgMuted?: string
  sectionBg?: string
}

// The "ACTIVITY" StatSection (Days Played / Day Streak / Best Day Streak) - extracted verbatim
// from every fleet app's own achievements.tsx (Snake, AirHockey, BoxHockey, Pong, LightCycles),
// where this exact three-row block was byte-for-byte identical. ActivityStats is a plain
// structural type (matching @tastic/achievements' own DayStreakState shape - distinctDaysPlayed/
// currentDayStreak/bestDayStreak) rather than importing DayStreakState itself, so this component
// has no dependency on @tastic/achievements at all: any caller's own stats/statsView object that
// happens to carry these three fields already satisfies it structurally.
export function ActivityStatSection({ stats, fg, fgMuted, sectionBg }: Props) {
  return (
    <StatSection label='ACTIVITY' fg={fg} sectionBg={sectionBg}>
      <StatRow label='Days Played' value={String(stats.distinctDaysPlayed)} fg={fg} fgMuted={fgMuted} />
      <StatRow label='Day Streak' value={String(stats.currentDayStreak)} fg={fg} fgMuted={fgMuted} />
      <StatRow label='Best Day Streak' value={String(stats.bestDayStreak)} fg={fg} fgMuted={fgMuted} />
    </StatSection>
  )
}
