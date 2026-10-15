import { useAutoPaperTheme } from '@rific/auto-paper'
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'
import { Icon, Text } from 'react-native-paper'

// Below this much height every dialog uses the compact header (and the guide its smaller art). It is
// the height of the space the dialog lays out in, counted along the CARD's own vertical axis: the
// frame's height for an upright card, the frame's width for a card turned a quarter (see
// useCompactDialog.ts). The how-to-play guide borrows this file, so it imports nothing heavier than
// paper and auto-paper (see guideImports.test.ts); the hook, which needs @tastic/core, lives apart. 528 is the guide's old rule (480 of usable height inside its 24pt gutters): a
// phone held sideways (320-430) is compact, a small phone upright (568+) and an iPad either way are not.
export const COMPACT_DIALOG_HEIGHT = 528

export function isCompactDialogHeight(height: number): boolean {
  return height < COMPACT_DIALOG_HEIGHT
}

export interface DialogHeaderProps {
  // Any react-native-paper Icon `source` name.
  icon: string
  title: string
  // The icon and title color. Defaults to the theme's primary; ConfirmDialog passes its danger role
  // when destructive.
  color?: string
  // A short space (see useCompactDialog.ts): the icon moves beside the title, at half size, so a sheet
  // keeps its reading room.
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

// The one header every dialog in the fleet opens with (Jay, 2026-10-15: "they should all have the same
// title and maybe an icon"): a 64pt icon over a large bold title, both in the accent color, centered.
// ConfirmDialog, the How to Play guide, BaseSettingsDialog and every app's own result cards use it,
// so a dialog never hand-rolls its own title again.
export function DialogHeader({ icon, title, color, compact = false, style }: DialogHeaderProps) {
  const { colors } = useAutoPaperTheme()
  const accent = color ?? colors.primary
  return (
    <View style={[compact ? styles.compact : styles.full, style]}>
      <Icon source={icon} size={compact ? COMPACT_ICON_SIZE : ICON_SIZE} color={accent} />
      <Text accessibilityRole='header' variant={compact ? 'headlineSmall' : 'headlineLarge'} style={[styles.title, compact && styles.titleCompact, { color: accent }]}>
        {title}
      </Text>
    </View>
  )
}

const ICON_SIZE = 64
const COMPACT_ICON_SIZE = 32

const styles = StyleSheet.create({
  compact: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center'
  },
  full: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 16
  },
  // textAlign matters once a title wraps: the card centers the Text's block, but each wrapped line
  // still defaults to left-aligned without it.
  title: {
    fontWeight: 'bold',
    textAlign: 'center'
  },
  titleCompact: {
    flexShrink: 1
  }
})
