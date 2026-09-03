import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button, IconButton } from '@rific/feedback-press'
import { ReactNode, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Icon, Portal, Text } from 'react-native-paper'

// react-native-paper's own MD3 Text variant names — mirrored locally rather than importing its
// internal VariantProp/MD3TypescaleKey (not exported from the package's public entry point) just
// to type one optional prop.
type MD3TextVariant = 'displayLarge' | 'displayMedium' | 'displaySmall' | 'headlineLarge' | 'headlineMedium' | 'headlineSmall' | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'labelLarge' | 'labelMedium' | 'labelSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall'

interface Props {
  // Live physical-hold rotation (see @tastic/split-screen's getViewRotation) — this dialog renders
  // as a centered Portal modal, unaffected by whichever screen's own FakeLandscapeView wraps its
  // trigger, so it has to rotate its own card content to read right-side-up for whichever way the
  // phone is actually being held. Defaults to 0 for a caller that doesn't track one — matches
  // BaseSettingsDialog's own identical prop, though the first apps consuming this screen shell
  // don't wrap it in a FakeLandscapeView at all and so never have a nonzero one to give.
  rotation?: number
  title?: string
  // 'headlineSmall' (this screen's own default, below) — was originally 'displaySmall' (the full
  // display tier's own smallest step), then 'headlineLarge', both still read as oversized for a
  // header that's paired with a small 24px back-button glyph rather than standing alone the way a
  // title screen's own wordmark does; headlineSmall sits close to that icon's own size instead of
  // towering over it. Any react-native-paper MD3 Text variant, not just the headline tier, for a
  // caller that wants something else entirely.
  titleVariant?: MD3TextVariant
  onBack: () => void
  insets: { top: number; left: number; bottom: number; right: number }
  // Optional, and always passed as a pair — a caller with nothing resettable (or that deliberately
  // doesn't want a reset action on this screen) omits both rather than one alone. Confirmation copy
  // is caller-owned since "erases all stats and achievements" is only accurate for a caller that
  // actually tracks both; a caller with only high scores, say, would want its own wording.
  onReset?: () => void
  resetLabel?: string
  resetConfirmTitle?: string
  resetConfirmBody?: string
  // Independently optional overrides for this screen's own background/text colors — each defaults
  // to the literal-black/white-by-appearance formula described below when omitted, so every
  // existing caller (none of which pass these) renders identically to before. A caller with its own
  // app-wide chrome palette (e.g. a tinted background rather than neutral black/white) passes
  // whichever of the three it needs; cardBorder on the reset-confirm overlay stays fixed regardless,
  // since its low alpha already reads fine against any cardBg.
  fg?: string
  bg?: string
  cardBg?: string
  // Overrides the confirm-overlay's alert icon/title, which otherwise default to auto-paper's
  // colors.secondary. That default is tuned to read against auto-paper's OWN background role, not
  // necessarily against a cardBg override above — a caller passing cardBg should generally pass a
  // matching accentColor too, rather than risk colors.secondary landing close in hue/lightness to
  // its own custom card background (this is what actually happened with a tinted felt cardBg in the
  // app this was first overridden for). Every button on this screen (the reset trigger included)
  // fills with colors.secondary/onSecondary as a self-contained, always-legible pair instead of
  // relying on a text-only color read against the surrounding chrome, so none of them need this —
  // only the bare icon/title do.
  accentColor?: string
  children: ReactNode
}

// The stats/achievements screen shell every @tastic game shares — back button + title header,
// scrollable content area, and an optional reset-everything action with its own confirm-before-
// destroying overlay — extracted after the same header/scroll/reset-confirm shape was independently
// built into LightCycles' own achievements.tsx. Colors default to the same literal-black/white-by-
// appearance formula BaseSettingsDialog hardcodes internally (same as this package's own
// BaseSettingsDialog) — zero-config for every existing caller — but fg/bg/cardBg are each
// independently overridable for a caller whose own app-wide chrome palette isn't that literal
// black/white convention. `children` is the seam for whatever isn't shared: this component has no
// opinion on what a "stat" is or how achievements are catalogued — see StatRow/StatSection/
// AchievementRow for the smaller presentational pieces built to go inside it.
export function BaseStatsScreen({ rotation = 0, title = 'Achievements', titleVariant = 'headlineSmall', onBack, insets, onReset, resetLabel = 'Reset All Stats', resetConfirmTitle = 'Reset Everything?', resetConfirmBody = 'This permanently erases all stats and achievements. This cannot be undone.', fg: fgOverride, bg: bgOverride, cardBg: cardBgOverride, accentColor: accentColorOverride, children }: Props) {
  const { dark, colors } = useAutoPaperTheme()
  const [confirmResetVisible, setConfirmResetVisible] = useState(false)
  const showReset = !!onReset

  // High-contrast retro look by default: literal black/white by appearance, matching every other
  // screen in this ecosystem (title/loadout/settings all use this identical formula) rather than
  // auto-paper's own (slightly tinted) background role — same convention BaseSettingsDialog's own
  // fg/cardBg/cardBorder use internally. Overridable per-instance via the props above for a caller
  // whose own chrome isn't that literal black/white convention; cardBorder has no override (see the
  // Props doc above for why).
  const fg = fgOverride ?? (dark ? '#FFFFFF' : '#000000')
  const bg = bgOverride ?? (dark ? '#000000' : '#FFFFFF')
  const cardBg = cardBgOverride ?? (dark ? '#111111' : '#F2F2F2')
  const cardBorder = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
  const accentColor = accentColorOverride ?? colors.secondary

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: 8 + insets.top, paddingLeft: 8 + insets.left }]}>
        <IconButton icon='arrow-left' iconColor={fg} size={24} onPress={onBack} />
        <Text variant={titleVariant} style={[styles.title, { color: fg }]}>
          {title}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {children}

        {showReset && (
          <Button mode='contained' onPress={() => setConfirmResetVisible(true)} buttonColor={colors.secondary} textColor={colors.onSecondary} style={styles.resetButton}>
            {resetLabel}
          </Button>
        )}
      </ScrollView>

      {confirmResetVisible && (
        <Portal>
          <View style={[styles.overlay, rotation % 360 !== 0 && { transform: [{ rotate: `${rotation}deg` }] }]}>
            <View style={[styles.overlayCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Icon source='alert-outline' size={64} color={accentColor} />
              <Text variant='headlineLarge' style={[styles.overlayTitle, { color: accentColor }]}>
                {resetConfirmTitle}
              </Text>
              <Text variant='bodyLarge' style={[styles.overlayBody, { color: fg }]}>
                {resetConfirmBody}
              </Text>
              <Button mode='contained' onPress={() => setConfirmResetVisible(false)} style={styles.overlayButton}>
                Cancel
              </Button>
              <Button
                mode='contained'
                onPress={() => {
                  onReset?.()
                  setConfirmResetVisible(false)
                }}
                style={styles.overlayButton}
                buttonColor={colors.secondary}
                textColor={colors.onSecondary}
              >
                Reset
              </Button>
            </View>
          </View>
        </Portal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    gap: 12,
    paddingHorizontal: 20
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 8
  },
  // Same overlay shape BaseSettingsDialog's own info overlay uses (backdrop + centered card),
  // rotated in place the same way rather than via Portal-root transform for the same reason — see
  // that component's own identical styles for the full rationale.
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  overlayBody: { textAlign: 'center' },
  overlayButton: { width: 160 },
  overlayCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    maxWidth: 360,
    padding: 32
  },
  overlayTitle: { fontWeight: 'bold', marginBottom: -8 },
  resetButton: {
    marginTop: 16
  },
  // Bounds the ScrollView to the space `container`'s flex:1 actually gives it — without this, a
  // ScrollView with only a contentContainerStyle isn't reliably height-constrained on native (it
  // can render at its full unclipped content height instead of the screen's), which leaves the
  // header's back button touch target unreliable underneath it.
  scrollView: {
    flex: 1
  },
  title: {
    flexShrink: 1,
    fontWeight: 'bold'
  }
})
