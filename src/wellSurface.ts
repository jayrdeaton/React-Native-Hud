import { useAutoPaperTheme } from '@rific/auto-paper'

// A well is a resting card on a screen: a stats section, an achievement row, a game's menu tile. Every well in the
// fleet is the theme's plain surface (the same surface as the dialogs, OverlayCard and auto-paper's Dialog) lifted off
// the screen by MD3's level-1 shadow, with no elevation tint (Jay, 2026-10-17: Solitaire's Achievements wells read as
// a different shade from its Home tiles, and he picked "shadow, no tint" over MD3's tonal elevation, which washes the
// surface with the primary like the dialogs no longer are).
//
// The shadow is what makes a well show on a screen the color of the surface: MD3 (as react-native-paper implements it)
// gives `background` and `surface` the same tone, and BaseStatsScreen's light-mode #FFFFFF is the same as the light
// surface to the eye. In dark mode the surface is already lighter than a black screen, and the shadow barely shows.

// MD3's level-1 elevation shadow (its web spec's two layers: a tight key shadow and a soft ambient one). boxShadow is
// drawn outside the view on iOS, Android and web alike, so a well's own background is never darkened by it.
export const WELL_SHADOW = '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)'

export interface WellColors {
  // The well's own background.
  bg: string
  // Text on the well: titles and values, then labels and descriptions.
  fg: string
  fgMuted: string
}

// The colors of a well and the text on it, from the app's own theme: the same roles the dialogs' text uses
// (useOverlayCardColors).
export function useWellColors(): WellColors {
  const { colors } = useAutoPaperTheme()
  return { bg: colors.surface, fg: colors.onSurface, fgMuted: colors.onSurfaceVariant }
}
