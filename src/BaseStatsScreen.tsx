import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button, IconButton } from '@rific/feedback-press'
import { useRotation, type ViewRotation } from '@tastic/core'
import { ReactNode, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { ConfirmDialog } from './ConfirmDialog'

// react-native-paper's own MD3 Text variant names — mirrored locally rather than importing its
// internal VariantProp/MD3TypescaleKey (not exported from the package's public entry point) just
// to type one optional prop.
type MD3TextVariant = 'displayLarge' | 'displayMedium' | 'displaySmall' | 'headlineLarge' | 'headlineMedium' | 'headlineSmall' | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'labelLarge' | 'labelMedium' | 'labelSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall'

interface Props {
  // Explicit override for the live physical-hold rotation (see @tastic/core's useRotation) — only
  // affects this component's own Portal-rendered reset-confirm dialog (via ConfirmDialog's own
  // rotation prop), which (like any Portal content) is unaffected by whichever screen's own
  // FakeLandscapeView wraps the trigger and so has to rotate itself. Defaults to a live ambient
  // read via useRotation() when omitted — note this does NOT make the header/scrollable content
  // below rotate; the caller's own screen still needs its own FakeLandscapeView wrap for that
  // (this component has no transform on its own main body).
  rotation?: ViewRotation
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
  // Independently optional overrides for this screen's own header/background colors — each
  // defaults to the literal-black/white-by-appearance formula described below when omitted, so
  // every existing caller (none of which pass these) renders identically to before. A caller with
  // its own app-wide chrome palette (e.g. a tinted background rather than neutral black/white)
  // passes whichever of the two it needs.
  //
  // There used to be a third override here, cardBg, plus a separate accentColor override for the
  // reset-confirm dialog's own icon/title/card. Both are gone: the reset-confirm step used to be a
  // hand-rolled lookalike of ConfirmDialog with its own copy of the overlay/card/button styling,
  // which is exactly how it drifted from ConfirmDialog's real look in the first place (different
  // button layout, different Cancel styling, and — via cardBg — a different, caller-tintable card
  // background no other ConfirmDialog in the fleet has). It now renders a real ConfirmDialog
  // instance below instead of its own copy, which by construction can never drift from every other
  // confirm prompt in the app again — at the cost of losing that per-caller tinting, which is the
  // right trade: a "you're about to erase everything" prompt should look and read identically
  // everywhere, not take on whichever screen happened to trigger it.
  fg?: string
  bg?: string
  children: ReactNode
}

// The stats/achievements screen shell every @tastic game shares — back button + title header,
// scrollable content area, and an optional reset-everything action with its own confirm-before-
// destroying dialog — extracted after the same header/scroll/reset-confirm shape was independently
// built into LightCycles' own achievements.tsx. Colors default to the same literal-black/white-by-
// appearance formula BaseSettingsDialog hardcodes internally (same as this package's own
// BaseSettingsDialog) — zero-config for every existing caller — but fg/bg are each independently
// overridable for a caller whose own app-wide chrome palette isn't that literal black/white
// convention. `children` is the seam for whatever isn't shared: this component has no opinion on
// what a "stat" is or how achievements are catalogued — see StatRow/StatSection/AchievementRow for
// the smaller presentational pieces built to go inside it.
export function BaseStatsScreen({ rotation: rotationOverride, title = 'Achievements', titleVariant = 'headlineSmall', onBack, insets, onReset, resetLabel = 'Reset All Stats', resetConfirmTitle = 'Reset Everything?', resetConfirmBody = 'This permanently erases all stats and achievements. This cannot be undone.', fg: fgOverride, bg: bgOverride, children }: Props) {
  const { dark, colors } = useAutoPaperTheme()
  const ambientRotation = useRotation()
  const rotation = rotationOverride ?? ambientRotation
  const [confirmResetVisible, setConfirmResetVisible] = useState(false)
  const showReset = !!onReset

  // High-contrast retro look by default: literal black/white by appearance, matching every other
  // screen in this ecosystem (title/loadout/settings all use this identical formula) rather than
  // auto-paper's own (slightly tinted) background role. Overridable per-instance via the props
  // above for a caller whose own chrome isn't that literal black/white convention.
  const fg = fgOverride ?? (dark ? '#FFFFFF' : '#000000')
  const bg = bgOverride ?? (dark ? '#000000' : '#FFFFFF')

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
          <Button mode='contained' onPress={() => setConfirmResetVisible(true)} buttonColor={colors.danger} textColor={colors.onDanger} style={styles.resetButton}>
            {resetLabel}
          </Button>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmResetVisible}
        title={resetConfirmTitle}
        message={resetConfirmBody}
        confirmLabel='Reset'
        cancelLabel='Cancel'
        icon='alert-outline'
        destructive
        rotation={rotation}
        onCancel={() => setConfirmResetVisible(false)}
        onConfirm={() => {
          onReset?.()
          setConfirmResetVisible(false)
        }}
      />
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
