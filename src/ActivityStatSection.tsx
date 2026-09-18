import { StatRow } from './StatRow'
import { StatSection } from './StatSection'

interface ActivityStats {
  distinctDaysPlayed: number
  currentDayStreak: number
  bestDayStreak: number
}

interface Props {
  stats: ActivityStats
}

// The "ACTIVITY" StatSection (Days Played / Day Streak / Best Day Streak) - extracted verbatim
// from every fleet app's own achievements.tsx (Snake, AirHockey, BoxHockey, Pong, LightCycles),
// where this exact three-row block was byte-for-byte identical. ActivityStats is a plain
// structural type (matching @tastic/achievements' own DayStreakState shape - distinctDaysPlayed/
// currentDayStreak/bestDayStreak) rather than importing DayStreakState itself, so this component
// has no dependency on @tastic/achievements at all: any caller's own stats/statsView object that
// happens to carry these three fields already satisfies it structurally.
export function ActivityStatSection({ stats }: Props) {
  return (
    <StatSection label='ACTIVITY'>
      <StatRow label='Days Played' value={String(stats.distinctDaysPlayed)} />
      <StatRow label='Day Streak' value={String(stats.currentDayStreak)} />
      <StatRow label='Best Day Streak' value={String(stats.bestDayStreak)} />
    </StatSection>
  )
}
