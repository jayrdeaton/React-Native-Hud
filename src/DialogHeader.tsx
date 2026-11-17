import { useAutoPaperTheme } from '@rific/auto-paper'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { type StyleProp, StyleSheet, type TextStyle, View, type ViewStyle } from 'react-native'
import { Icon, Text } from 'react-native-paper'

// Below this much height every dialog uses the compact header (and the guide its smaller art). It is
// the height of the space the dialog lays out in (see useCompactDialog.ts). The how-to-play guide
// borrows this file, so it imports nothing heavier than paper and auto-paper (see
// guideImports.test.ts). 528 is the guide's old rule (480 of usable height inside its
// 24pt gutters): a phone held sideways (320-430) is compact, a small phone upright (568+) and an iPad
// either way are not.
export const COMPACT_DIALOG_HEIGHT = 528

export function isCompactDialogHeight(height: number): boolean {
  return height < COMPACT_DIALOG_HEIGHT
}

// How a game's dialog headers look, set once for the whole app (DialogHeaderStyleProvider). 'standard' is the fleet's: the icon at
// 64 over a large bold title, both in the accent. 'quiet' (HexFleet, 2026-11-17: Jay found the big icon and colored title undercut a
// serious game): a small icon beside the title, still in the accent (a destructive dialog's red, a ConfirmDialog's `iconColor`), and
// the title in the theme's plain text color in the game's own lettering (`titleStyle`), so color is left only in the small icon and
// the confirm button. Every dialog that opens with DialogHeader follows it: Settings, every ConfirmDialog (the update prompt is one),
// the How to Play guide
export type DialogHeaderTone = 'standard' | 'quiet'

export interface DialogHeaderStyle {
  tone: DialogHeaderTone
  // The title's lettering in the quiet tone, over its default (`titleLarge`, bold): a game's own title type (font, weight, size,
  // letter spacing, case). The standard tone ignores it
  titleStyle?: StyleProp<TextStyle>
}

const DialogHeaderStyleContext = createContext<DialogHeaderStyle>({ tone: 'standard' })

// Wrap the app in it once, above anything that renders a dialog (and above auto-paper's Provider, whose portal host the dialogs render
// into). Without it every header is the standard one
export function DialogHeaderStyleProvider({ tone, titleStyle, children }: DialogHeaderStyle & { children: ReactNode }) {
  const value = useMemo(() => ({ tone, titleStyle }), [tone, titleStyle])
  return <DialogHeaderStyleContext.Provider value={value}>{children}</DialogHeaderStyleContext.Provider>
}

export function useDialogHeaderStyle(): DialogHeaderStyle {
  return useContext(DialogHeaderStyleContext)
}

export interface DialogHeaderProps {
  // Any react-native-paper Icon `source` name.
  icon: string
  title: string
  // The icon and title color. Defaults to the theme's primary; ConfirmDialog passes its danger role
  // when destructive.
  color?: string
  // The icon's own color, when it shouldn't match the title: HexFleet's Forfeit dialog draws its flag
  // white (a surrender) under a red title (Jay, 2026-11-15). Defaults to `color`.
  iconColor?: string
  // A short space (see useCompactDialog.ts): the icon moves beside the title, at half size, so a sheet
  // keeps its reading room.
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

// The one header every dialog in the fleet opens with (Jay, 2026-10-15: "they should all have the same
// title and maybe an icon"): a 64pt icon over a large bold title, both in the accent color (the icon in
// `iconColor` when given), centered.
// ConfirmDialog, the How to Play guide, BaseSettingsDialog and every app's own result cards use it,
// so a dialog never hand-rolls its own title again.
// In the quiet tone (DialogHeaderStyleProvider) it's a small icon beside a plain title instead, compact or not.
export function DialogHeader({ icon, title, color, iconColor, compact = false, style }: DialogHeaderProps) {
  const { colors } = useAutoPaperTheme()
  const { tone, titleStyle } = useDialogHeaderStyle()
  const accent = color ?? colors.primary
  if (tone === 'quiet')
    return (
      <View style={[styles.quiet, style]}>
        <Icon source={icon} size={QUIET_ICON_SIZE} color={iconColor ?? accent} />
        <Text accessibilityRole='header' variant='titleLarge' style={[styles.title, styles.titleCompact, { color: colors.onSurface }, titleStyle]}>
          {title}
        </Text>
      </View>
    )
  return (
    <View style={[compact ? styles.compact : styles.full, style]}>
      <Icon source={icon} size={compact ? COMPACT_ICON_SIZE : ICON_SIZE} color={iconColor ?? accent} />
      <Text accessibilityRole='header' variant={compact ? 'headlineSmall' : 'headlineLarge'} style={[styles.title, compact && styles.titleCompact, { color: accent }]}>
        {title}
      </Text>
    </View>
  )
}

const ICON_SIZE = 64
const COMPACT_ICON_SIZE = 32
const QUIET_ICON_SIZE = 22

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
  quiet: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center'
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
