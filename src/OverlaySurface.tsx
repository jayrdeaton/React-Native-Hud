import { BlurView, useAutoPaperTheme, useBlur } from '@rific/auto-paper'
import { type ReactNode } from 'react'
import { type LayoutChangeEvent, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'

import { overlayStyles } from './overlayCard'

export interface OverlayCardThemeColors {
  fg: string
  fgMuted: string
  cardBorder: string
  backdrop: string
}

// The colors for text and edges on an OverlayCard, taken from the app's own theme (Jay, 2026-10-15:
// the cards follow each game's palette instead of the old literal black/white "retro" card).
export function useOverlayCardColors(): OverlayCardThemeColors {
  const { colors } = useAutoPaperTheme()
  return { fg: colors.onSurface, fgMuted: colors.onSurfaceVariant, cardBorder: colors.outlineVariant, backdrop: colors.backdrop }
}

export interface OverlayBackdropProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  // useCompactDialog's onLayout (DialogHeader.tsx): the backdrop fills the space the dialog lays out in.
  onLayout?: (e: LayoutChangeEvent) => void
}

// The full-screen dim behind a card: overlayStyles.overlay's geometry in the theme's own backdrop
// color (the same scrim auto-paper's Dialog uses), lighter than the old solid 72% black.
export function OverlayBackdrop({ children, style, onLayout }: OverlayBackdropProps) {
  const { backdrop } = useOverlayCardColors()
  return (
    <View onLayout={onLayout} style={[overlayStyles.overlay, { backgroundColor: backdrop }, style]}>
      {children}
    </View>
  )
}

export interface OverlayCardProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  accessibilityViewIsModal?: boolean
  testID?: string
}

// The card itself: the same surface as auto-paper's Dialog, which BaseSettingsDialog's sheet is drawn
// on, so every dialog in the fleet looks like one family (Jay, 2026-10-15: the card used to sit at
// elevation 3, MD3's wash of the theme's primary, and next to the plain Settings sheet it read as a
// different shade; he preferred the sheet). So: auto-paper's BlurView with no elevation (the theme's
// plain surface), no border, and the Dialog's own corner radius (7 x the theme's roundness, 28 at MD3's
// default). It blurs whatever is behind it when the player's Blur setting is on and the app has handed
// expo-blur to auto-paper's Provider, and otherwise paints that surface on its own: on Android (no blur
// target here), in an app without expo-blur, or with Blur off. Beyond passing expoBlur to auto-paper's
// Provider, an app wires nothing for the blur.
// BlurView itself only follows its `blur` prop (on by default), so the setting is read here with
// useBlur(), the same way auto-paper's own Dialog and Menu read it.
// overflow: hidden keeps a native blur inside the card's rounded corners.
export function OverlayCard({ children, style, ...rest }: OverlayCardProps) {
  const { isV3, roundness } = useAutoPaperTheme()
  const blur = useBlur()
  return (
    <BlurView blur={blur} style={[overlayStyles.card, styles.card, { borderRadius: (isV3 ? 7 : 1) * roundness }, style]} {...rest}>
      {children}
    </BlurView>
  )
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' }
})
