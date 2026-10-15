import { BlurView, useAutoPaperTheme, useBlur } from '@rific/auto-paper'
import { type ReactNode } from 'react'
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'

import { overlayStyles } from './overlayCard'

export interface OverlayCardThemeColors {
  fg: string
  fgMuted: string
  cardBorder: string
  backdrop: string
}

// The colors for text and edges on an OverlayCard, taken from the app's own theme (Jay, 2026-10-15:
// the cards follow each game's palette instead of the old literal black/white "retro" formula that
// getOverlayCardColors still returns for apps that haven't moved over yet).
export function useOverlayCardColors(): OverlayCardThemeColors {
  const { colors } = useAutoPaperTheme()
  return { fg: colors.onSurface, fgMuted: colors.onSurfaceVariant, cardBorder: colors.outlineVariant, backdrop: colors.backdrop }
}

export interface OverlayBackdropProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

// The full-screen dim behind a card: overlayStyles.overlay's geometry in the theme's own backdrop
// color (the same scrim auto-paper's Dialog uses), lighter than the old solid 72% black.
export function OverlayBackdrop({ children, style }: OverlayBackdropProps) {
  const { backdrop } = useOverlayCardColors()
  return <View style={[overlayStyles.overlay, { backgroundColor: backdrop }, style]}>{children}</View>
}

export interface OverlayCardProps {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  accessibilityViewIsModal?: boolean
  testID?: string
}

// The card itself, on auto-paper's BlurView at elevation 3 (MD3's dialog surface: the theme's surface
// with a light wash of its primary). It blurs whatever is behind it when the player's Blur setting is
// on and the app has handed expo-blur to auto-paper's Provider, and otherwise falls back to that
// raised surface color on its own: on Android (no blur target here), in an app without expo-blur, or
// with Blur off. So every game gets the same card, and beyond passing expoBlur to auto-paper's
// Provider, it wires nothing for the blur.
// BlurView itself only follows its `blur` prop (on by default), so the setting is read here with
// useBlur(), the same way auto-paper's own Dialog and Menu read it.
// overflow: hidden keeps a native blur inside the card's rounded corners.
export function OverlayCard({ children, style, ...rest }: OverlayCardProps) {
  const { cardBorder } = useOverlayCardColors()
  const blur = useBlur()
  return (
    <BlurView blur={blur} elevation={3} style={[overlayStyles.card, styles.card, { borderColor: cardBorder }, style]} {...rest}>
      {children}
    </BlurView>
  )
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' }
})
