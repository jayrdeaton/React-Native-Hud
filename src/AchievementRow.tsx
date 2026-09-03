import { useAutoPaperTheme } from '@rific/auto-paper'
import { StyleSheet, View } from 'react-native'
import { Icon, ProgressBar, Text } from 'react-native-paper'

// A neutral gray for a locked badge's own background — exported so a caller computing its own
// badge color (unlocked ? tierColor : LOCKED_BADGE_COLOR, matching LightCycles' own achievements.tsx)
// doesn't need to invent or duplicate this exact tone.
export const LOCKED_BADGE_COLOR = 'rgba(128,128,128,0.3)'

interface Props {
  icon: string
  title: string
  description: string
  // The badge's own background — pass the achievement's tier color when unlocked, or
  // LOCKED_BADGE_COLOR (this package's own export, above) when it isn't; this component doesn't
  // infer that from unlockedLabel itself, since a locked-vs-unlocked badge color scheme is a
  // caller-level design choice (see checkColor below for the identical reasoning on the status
  // icon's own color).
  badgeColor: string
  // undefined = locked. A precomputed display string (e.g. "Unlocked 2 days ago"), not a raw
  // timestamp — this component has no opinion on date formatting or streak conventions, which vary
  // per app (see LightCycles' own calendar-day-difference convention in its achievements.tsx).
  unlockedLabel?: string
  // Color for the unlocked check-circle icon/badge glyph — typically the same tier color passed to
  // badgeColor, kept as its own prop rather than reused internally so a caller can special-case it
  // independently if its own tier scheme ever needs to (matching LightCycles' own call site, which
  // does pass the identical value to both today).
  checkColor?: string
  // Only rendered while locked (unlockedLabel is undefined) — 0..1.
  progress?: number
  // The "Same for every profile" note LightCycles shows for a device-scoped achievement viewed
  // from a specific profile's own tab — optional since only an app with per-profile stat views has
  // this concept at all.
  deviceMarker?: boolean
  // Independently optional overrides for this row's own text/background colors — each defaults to
  // the same dark-mode-derived formula as StatRow/StatSection/BaseStatsScreen (see that component's
  // own doc for why) when omitted, so every existing caller renders identically to before. A caller
  // with its own app-wide chrome palette passes whichever of the three it needs.
  fg?: string
  fgMuted?: string
  sectionBg?: string
}

// One row per achievement — a tier-colored (or locked-gray) badge, title/description, an optional
// progress bar while locked, and either an unlocked check-mark+label or a lock icon. Extracted
// verbatim from LightCycles' own achievements.tsx, where this exact row shape backed its entire
// "ALL ACHIEVEMENTS" list. fg/fgMuted/its own section background default to the same
// useAutoPaperTheme()-derived formula as StatRow/StatSection/BaseStatsScreen (see BaseStatsScreen's
// own doc for why), each independently overridable via the matching prop for a caller with its own
// chrome palette. Has no opinion on what an achievement actually IS (id, unlock predicate, catalog)
// — that stays entirely app-local; this is purely the presentational row.
export function AchievementRow({ icon, title, description, badgeColor, unlockedLabel, checkColor, progress, deviceMarker, fg: fgOverride, fgMuted: fgMutedOverride, sectionBg: sectionBgOverride }: Props) {
  const { dark } = useAutoPaperTheme()
  const fg = fgOverride ?? (dark ? '#FFFFFF' : '#000000')
  const fgMuted = fgMutedOverride ?? (dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)')
  const sectionBg = sectionBgOverride ?? (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
  const unlocked = unlockedLabel !== undefined

  return (
    <View style={[styles.row, { backgroundColor: sectionBg }]}>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Icon source={icon} size={20} color={unlocked ? '#000000' : fgMuted} />
      </View>
      <View style={styles.text}>
        <Text variant='bodyLarge' style={[styles.boldText, { color: fg }]}>
          {title}
        </Text>
        <Text variant='bodySmall' style={{ color: fgMuted }}>
          {description}
        </Text>
        {deviceMarker && (
          <View style={styles.deviceMarker}>
            <Icon source='earth' size={11} color={fgMuted} />
            <Text variant='labelSmall' style={{ color: fgMuted }}>
              Same for every profile
            </Text>
          </View>
        )}
        {!unlocked && progress !== undefined && <ProgressBar progress={progress} color={checkColor ?? badgeColor} style={styles.progressBar} />}
      </View>
      {unlocked ? (
        <View style={styles.status}>
          <Icon source='check-circle' size={20} color={checkColor ?? badgeColor} />
          <Text variant='labelSmall' style={{ color: fgMuted }}>
            {unlockedLabel}
          </Text>
        </View>
      ) : (
        <Icon source='lock-outline' size={20} color={fgMuted} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  boldText: {
    fontWeight: 'bold'
  },
  deviceMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4
  },
  progressBar: {
    borderRadius: 4,
    height: 6,
    marginTop: 6
  },
  row: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 12
  },
  status: {
    alignItems: 'center',
    gap: 2,
    width: 64
  },
  text: {
    flex: 1,
    gap: 2
  }
})
