import { getContrastColor, useAutoPaperTheme } from '@rific/auto-paper'
import type { AchievementTier } from '@tastic/achievements'
import { type Profile, ProfileChip } from '@tastic/profile'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { Icon, Text } from 'react-native-paper'

// The only fields a row reads - structural, so any app's own AchievementDefinition<Stats> fits
// without this package caring about its stats type parameter.
export interface UnlockedAchievement {
  id: string
  icon: string
  title: string
  tier: AchievementTier
}

// Who a seat's rows belong to: their ProfileChip when a profile is selected, otherwise a plain
// avatar in the seat's own color (a guest seat has no tag to show). An app that draws profile colors
// muted wraps its tree in @tastic/profile's ProfileColorProvider (ProfileChip reads it) and passes
// an already-muted `color` here.
export interface AchievementUnlockOwner {
  profile?: Profile | null
  color: string
}

interface Props<Seat extends number> {
  unlocks: Partial<Record<Seat, UnlockedAchievement[]>>
  // Row order: every unlock of the first seat, then the next.
  seats: readonly Seat[]
  owners: Record<Seat, AchievementUnlockOwner>
  // Taken as a prop rather than imported: @tastic/achievements stays a type-only dependency of
  // this package. Callers pass its ACHIEVEMENT_TIER_COLORS (or their own palette).
  tierColors: Record<AchievementTier, string>
  fg?: string
  style?: ViewStyle
}

const AVATAR_SIZE = 18

// The newly-unlocked achievements on a game-over / round-over card, one row per achievement:
// owner avatar, tier-colored icon badge, title. Extracted from the per-app copies in Snake,
// LightCycles, Pong, BoxHockey and AirHockey, which had drifted to three different owner markers;
// this is the ProfileChip-or-color-avatar one most of them used. One row per achievement rather
// than a per-seat summary, so the list stays aligned when only one seat unlocked anything.
// Renders nothing when there are no unlocks at all.
export function AchievementUnlockList<Seat extends number>({ unlocks, seats, owners, tierColors, fg: fgOverride, style }: Props<Seat>) {
  const { dark } = useAutoPaperTheme()
  const fg = fgOverride ?? (dark ? '#FFFFFF' : '#000000')
  const rows = seats.flatMap((seat) => (unlocks[seat] ?? []).map((achievement) => ({ seat, achievement })))
  if (rows.length === 0) return null

  return (
    <View style={[styles.list, style]}>
      {rows.map(({ seat, achievement }) => {
        const owner = owners[seat]
        return (
          <View key={`${seat}-${achievement.id}`} style={styles.row}>
            {owner.profile ? (
              <ProfileChip profile={owner.profile} size={AVATAR_SIZE} />
            ) : (
              <View style={[styles.circle, { backgroundColor: owner.color }]}>
                <Icon source='account' size={10} color={getContrastColor(owner.color)} />
              </View>
            )}
            <View style={[styles.circle, { backgroundColor: tierColors[achievement.tier] }]}>
              <Icon source={achievement.icon} size={12} color='#000000' />
            </View>
            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              {achievement.title}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    borderRadius: AVATAR_SIZE / 2,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    width: AVATAR_SIZE
  },
  label: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700'
  },
  list: {
    gap: 6
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  }
})
