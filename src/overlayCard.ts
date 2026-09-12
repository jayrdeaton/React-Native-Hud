import { StyleSheet } from 'react-native'

export interface OverlayCardColors {
  fg: string
  fgMuted: string
  cardBg: string
  cardBorder: string
}

// The literal-black/white-by-appearance "retro" formula this package's own BaseSettingsDialog and
// ConfirmDialog each independently re-derived — deliberately NOT auto-paper's own (seed-color-tinted)
// background role, see either component's own "High-contrast retro look" comment for why. Every
// fleet app's own Game-Over/Round-Over/Match-Over/Quit-confirmation overlay re-derives this same
// three-or-four-line formula again, which is what this export exists to replace.
export function getOverlayCardColors(dark: boolean): OverlayCardColors {
  return {
    fg: dark ? '#FFFFFF' : '#000000',
    fgMuted: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    cardBg: dark ? '#111111' : '#F2F2F2',
    cardBorder: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
  }
}

// Only the shell shape every overlay card shares (backdrop + card geometry) — deliberately not the
// button/title/body styling, which already legitimately varies by consumer (BaseSettingsDialog's
// single centered OK button vs. ConfirmDialog's two-button flexBasis-wrap row vs. each app's own
// score/badge/zone content). A consumer applies `{backgroundColor: cardBg, borderColor: cardBorder}`
// from getOverlayCardColors on top of `card` itself, same as every existing call site already does.
export const overlayStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    maxWidth: 360,
    padding: 32
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  }
})
