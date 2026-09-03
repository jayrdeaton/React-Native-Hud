import { AutoAppearancePicker, Dialog, useAutoPaperTheme } from '@rific/auto-paper'
import { Button, SoundContext, TouchableRipple, useHapticSettings, useSoundSettings, useVibration } from '@rific/feedback-press'
import { useUpdater } from '@rific/updater'
import { useIsTouchPrimaryDevice } from '@tastic/core'
import { ReactNode, useContext, useState } from 'react'
import { Platform, ScrollView, StyleSheet, View } from 'react-native'
import { Icon, Portal, Text } from 'react-native-paper'

interface SettingIconProps {
  source: string
  color: string
  containerColor: string
}

// Small colored badge per row (icon tinted on its own MD3 container color) — echoes the
// primary/secondary/tertiary triad that's already each consuming app's own identity, so the
// settings list picks up that same palette instead of introducing new colors of its own.
function SettingIcon({ source, color, containerColor }: SettingIconProps) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: containerColor }]}>
      <Icon source={source} size={18} color={color} />
    </View>
  )
}

export interface BaseSettingsDialogProps {
  visible: boolean
  onDismiss: () => void
  // Live physical-hold rotation (see @tastic/split-screen's getViewRotation) — this is a centered,
  // app-wide modal with no per-player zone to match (unlike an in-game round-over dialog), so it
  // just rotates its own content in place; defaults to 0 for a caller that doesn't track one (a
  // game with no face-to-face two-player mode has nothing to stay consistent with anyway).
  rotation?: number
  // Each app's own OTA version (e.g. release.otaVersion) — not something this package can read
  // itself, since every consuming app tracks its own release.ts independently. Accepts a number too
  // since that's what release.otaVersion actually is in most apps (a bare incrementing counter, not
  // a formatted string) — this just interpolates it into the VERSION label same as the original
  // inline JSX did.
  version: string | number
  // Optional, and always passed as a pair — omit both entirely for a game that's portrait-only (or
  // otherwise has no orientation-based reflow at all), where there's nothing to lock against.
  lockOrientation?: boolean
  onLockOrientationChange?: (value: boolean) => void
  // Optional, and always passed as a pair — omit both entirely for a game with no full-screen edge-
  // anchored swipe controls (nothing to guard). iOS-only regardless of whether the pair is passed:
  // @tastic/edge-guard's own swizzle is a no-op on every other platform.
  deferBottomEdgeGestures?: boolean
  onDeferBottomEdgeGestures?: (value: boolean) => void
  // Explicit opt-outs for the rows that pull their own state straight from @rific/feedback-press,
  // @rific/auto-paper, and @rific/updater's own shared contexts/hooks rather than from anything the
  // caller passes in — unlike Lock Orientation/Edge Guard above, there's no "value" to omit for
  // these, so hiding one takes its own explicit flag instead. All default to shown, matching every
  // app's existing behavior before this prop existed.
  hideSound?: boolean
  // Haptics is already native-only (see the row's own Platform.OS check) — this hides it even
  // there, for a game that's deliberately silent on vibration.
  hideHaptics?: boolean
  hideAppearance?: boolean
  // Check for Updates is already native-only (a web build has no OTA update concept at all) — this
  // hides it even there, for a native app that isn't wired up for EAS/OTA updates at all.
  hideUpdateCheck?: boolean
  // Surfaces a failed update check (e.g. via @rific/toaster's error()) — omit for an app with no
  // toast system wired up; the check itself still runs and still reports success/no-update through
  // the ordinary info overlay either way. Meaningless (never called) when hideUpdateCheck is set.
  onUpdateError?: (message: string) => void
  // App-specific extra settings sections (board options, CPU difficulty, stats backup, ...),
  // rendered between Appearance and Check for Updates — this component only owns the settings
  // every game shares, never anything about how a particular game plays.
  children?: ReactNode
}

// The settings shell every @tastic game shares — orientation lock, the optional edge-guard toggle,
// sound/haptics, appearance, and update checking — extracted after the same six rows were
// independently copied into LightCycles, AirHockey, BoxHockey, Pong, and Snake and then needed
// hand-editing in every one of them, twice, for what were meant to be identical fixes. `children`
// is the seam for whatever isn't shared: a game with its own board/difficulty settings (or a stats
// backup flow, or anything else genuinely specific to it) renders those below Appearance, not by
// forking this component.
export function BaseSettingsDialog({ visible, onDismiss, rotation = 0, version, lockOrientation, onLockOrientationChange, deferBottomEdgeGestures, onDeferBottomEdgeGestures, hideSound = false, hideHaptics = false, hideAppearance = false, hideUpdateCheck = false, onUpdateError, children }: BaseSettingsDialogProps) {
  const { dark, colors } = useAutoPaperTheme()
  // Also gates the Lock Orientation row below (alongside showLockOrientation itself) — true
  // unconditionally on native (see the hook's own doc), so this only actually excludes a
  // desktop/laptop browser, where a mouse-driven window has no physical orientation to lock
  // against; a resize there would just make the setting silently stop reflowing the layout instead
  // of actually locking anything.
  const isTouchPrimary = useIsTouchPrimaryDevice()
  const { settings: hapticSettings, set: setHapticSettings } = useHapticSettings()
  const { settings: soundSettings, set: setSoundSettings } = useSoundSettings()
  // Sound/Haptics toggle themselves: the ripple's automatic press feedback fires on onPressIn,
  // before onPress applies the toggle, so it reflects the OLD enabled value — backwards from what
  // a settings toggle should confirm (turning off would click/buzz, turning on would go silent).
  // Both rows disable their own automatic channel below (soundDisabled/hapticDisabled) and fire it
  // manually here instead, gated on the NEW value so it only plays when switching that channel on.
  const sound = useContext(SoundContext)
  const { forceShort: forceHapticFeedback } = useVibration()
  // Covers check()'s three purely-informational cases (dev-mode disabled, web unsupported, no
  // update found) via onInfo below — a retro card overlay instead of the native Alert.alert those
  // cases fall back to by default.
  const [infoMessage, setInfoMessage] = useState<{ title: string; message: string } | null>(null)
  // autoCheck: false — every consuming app's own root layout already runs the background check via
  // its own useUpdater() instance; a second instance with autoCheck's default (true) would set up a
  // second AppState listener and double every foreground-resume update check. This instance only
  // ever checks on an explicit tap of the button below.
  const { check, checking, updateReady } = useUpdater({
    autoCheck: false,
    autoPrompt: false,
    onError: onUpdateError,
    onInfo: (title, message) => setInfoMessage({ title, message })
  })

  const showLockOrientation = isTouchPrimary && lockOrientation !== undefined && onLockOrientationChange !== undefined
  const showEdgeGuard = Platform.OS === 'ios' && deferBottomEdgeGestures !== undefined && onDeferBottomEdgeGestures !== undefined
  const showHaptics = Platform.OS !== 'web' && !hideHaptics
  const showSound = !hideSound
  const showAppearance = !hideAppearance
  const showUpdateCheck = Platform.OS !== 'web' && !hideUpdateCheck

  // High-contrast retro look: literal black/white by appearance, not auto-paper's own (slightly
  // tinted) background role.
  const fg = dark ? '#FFFFFF' : '#000000'
  const cardBg = dark ? '#111111' : '#F2F2F2'
  const cardBorder = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'

  return (
    <>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, rotation % 360 !== 0 && { transform: [{ rotate: `${rotation}deg` }] }]}>
        <Dialog.Title>Settings</Dialog.Title>
        {/* react-native-paper's Dialog.ScrollArea has a fixed 24px marginBottom baked in (meant to
          reserve room for a Dialog.Actions row below it) — overridden to 0 since this dialog has
          no actions row, and that gap otherwise reads as unexplained empty footer space. */}
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Grouped tightly together (styles.toggleGroup's small internal gap, not the 24px gap
              between sections below) — same bare-row shape for all of them, no segmented control
              and no section heading (each row's own label already says what it is). Haptics only
              joins on native — there's nothing for it to control on web. */}
            <View style={styles.toggleGroup}>
              {/* Omitted entirely for a portrait-only game (no lockOrientation/onLockOrientationChange
                passed at all — nothing to lock), and hidden (not just disabled) on a desktop/laptop
                browser even when they are — see isTouchPrimary's own doc above. Still shown on
                native and on a touch-capable mobile browser, where a rotated window really does
                reflect a rotated device. */}
              {showLockOrientation && (
                <TouchableRipple onPress={() => onLockOrientationChange!(!lockOrientation)} style={styles.toggleButton} accessibilityLabel={`Lock orientation ${lockOrientation ? 'on' : 'off'}`}>
                  <View style={styles.toggleContent}>
                    <SettingIcon source={lockOrientation ? 'lock' : 'lock-open-variant-outline'} color={lockOrientation ? colors.secondary : colors.onSurfaceVariant} containerColor={lockOrientation ? colors.secondaryContainer : colors.surfaceVariant} />
                    <View style={styles.flexShrink}>
                      <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
                        Lock Orientation
                      </Text>
                      <Text variant='bodySmall' numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
                        Pins the current layout
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              )}

              {/* iOS only — mirrors into UserDefaults for @tastic/edge-guard's own config plugin
                swizzle to read. Guards both edges — the top (Notification Center/Control Center)
                and the bottom (home-indicator swipe, incidentally Reachability too), per that
                package's own doc. Off by default: a deliberate opt-in for whoever's actually hit an
                accidental-swipe-near-an-edge problem mid-game and come looking for a fix, not a
                surprise every player gets by default. */}
              {showEdgeGuard && (
                <TouchableRipple onPress={() => onDeferBottomEdgeGestures!(!deferBottomEdgeGestures)} style={styles.toggleButton} accessibilityLabel={`Edge guard ${deferBottomEdgeGestures ? 'on' : 'off'}`}>
                  <View style={styles.toggleContent}>
                    <SettingIcon source={deferBottomEdgeGestures ? 'shield-check-outline' : 'shield-off-outline'} color={deferBottomEdgeGestures ? colors.secondary : colors.onSurfaceVariant} containerColor={deferBottomEdgeGestures ? colors.secondaryContainer : colors.surfaceVariant} />
                    <View style={styles.flexShrink}>
                      <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
                        Edge Guard
                      </Text>
                      <Text variant='bodySmall' numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
                        Requires a second swipe
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              )}

              {/* Side by side, not stacked — neither needs a full row's width (single-line label,
                no description under it the way Lock Orientation has), so sharing one row reads
                just as clearly and takes half the vertical space. toggleRow carries the same
                edge-alignment negative margin toggleButton normally carries itself; the buttons
                inside it use toggleButtonInRow (flex: 1) instead so the two don't double up on it.
                The row itself only renders when at least one of the two will — an empty flex row
                still eats its own gap/margin otherwise. */}
              {(showSound || showHaptics) && (
                <View style={styles.toggleRow}>
                  {showSound && (
                    <TouchableRipple
                      soundDisabled
                      onPress={() => {
                        const enabled = !soundSettings.enabled
                        setSoundSettings({ enabled })
                        if (enabled) sound.selection?.()
                      }}
                      style={styles.toggleButtonInRow}
                      accessibilityLabel={`Sound ${soundSettings.enabled ? 'on' : 'off'}`}
                    >
                      <View style={styles.toggleContent}>
                        <SettingIcon source={soundSettings.enabled ? 'volume-high' : 'volume-off'} color={soundSettings.enabled ? colors.tertiary : colors.onSurfaceVariant} containerColor={soundSettings.enabled ? colors.tertiaryContainer : colors.surfaceVariant} />
                        <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
                          Sound
                        </Text>
                      </View>
                    </TouchableRipple>
                  )}

                  {/* Already native-only (see showHaptics's own definition) — hideHaptics can hide
                    it there too, for a game that's deliberately silent on vibration. */}
                  {showHaptics && (
                    <TouchableRipple
                      hapticDisabled
                      onPress={() => {
                        const vibrate = !hapticSettings.vibrate
                        setHapticSettings({ vibrate })
                        if (vibrate) forceHapticFeedback()
                      }}
                      style={styles.toggleButtonInRow}
                      accessibilityLabel={`Haptics ${hapticSettings.vibrate ? 'on' : 'off'}`}
                    >
                      <View style={styles.toggleContent}>
                        <SettingIcon source={hapticSettings.vibrate ? 'vibrate' : 'vibrate-off'} color={hapticSettings.vibrate ? colors.tertiary : colors.onSurfaceVariant} containerColor={hapticSettings.vibrate ? colors.tertiaryContainer : colors.surfaceVariant} />
                        <Text variant='bodyLarge' style={{ color: colors.onSurface }}>
                          Haptics
                        </Text>
                      </View>
                    </TouchableRipple>
                  )}
                </View>
              )}
            </View>

            {showAppearance && (
              <View style={styles.section}>
                <Text variant='labelMedium' style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                  APPEARANCE
                </Text>
                <AutoAppearancePicker showLabels={false} />
              </View>
            )}

            {children}

            {/* Native only (a web build has no OTA update concept at all, desktop or mobile browser
              alike) — hideUpdateCheck can hide it there too, for a native app that isn't wired up
              for EAS/OTA updates at all. */}
            {showUpdateCheck && (
              <View style={styles.section}>
                <Text variant='labelSmall' style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                  VERSION {version}
                  {updateReady ? ' · UPDATE READY' : ''}
                </Text>
                <Button mode='outlined' onPress={check} loading={checking} disabled={checking}>
                  Check for Updates
                </Button>
              </View>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
      </Dialog>
      {infoMessage && (
        <Portal>
          <View style={styles.overlay}>
            <View style={[styles.overlayCard, { backgroundColor: cardBg, borderColor: cardBorder }, rotation % 360 !== 0 && { transform: [{ rotate: `${rotation}deg` }] }]}>
              <Icon source='information-outline' size={64} color={colors.secondary} />
              <Text variant='headlineLarge' style={[styles.overlayTitle, { color: colors.secondary }]}>
                {infoMessage.title}
              </Text>
              <Text variant='bodyLarge' style={[styles.overlayBody, { color: fg }]}>
                {infoMessage.message}
              </Text>
              <Button mode='contained' onPress={() => setInfoMessage(null)} style={styles.overlayButton} buttonColor={colors.primary} textColor={colors.onPrimary}>
                OK
              </Button>
            </View>
          </View>
        </Portal>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
    paddingVertical: 20
  },
  // Caps the card so it never grows past the screen — without this the dialog just keeps
  // growing to fit its content and the overflow gets clipped by the screen edge, which is
  // what happened in landscape where there's less height to work with. Dialog.ScrollArea +
  // ScrollView below then take over and let the content scroll within that bound.
  dialog: {
    maxHeight: '90%'
  },
  flexShrink: {
    flexShrink: 1
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36
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
  overlayTitle: { fontWeight: 'bold' },
  scrollArea: {
    marginBottom: 0
  },
  section: {
    gap: 12
  },
  sectionLabel: {
    letterSpacing: 2
  },
  // Used to carry marginHorizontal: -12 + paddingHorizontal: 12 (netting to the same inset as
  // APPEARANCE/SOUND & HAPTICS below, while giving the ripple/hover highlight room to breathe
  // into the dialog's own gutter beyond that). Removed: this dialog scrolls (Dialog.ScrollArea +
  // ScrollView above), and on web a ScrollView's own content wrapper clips to its own bounds
  // regardless of a child's negative margin - confirmed live, the icon's own rounded-square badge
  // was getting its left edge sliced off by exactly that overhang. No horizontal inset of its own
  // now - it relies purely on the same dialog padding APPEARANCE/every other row already does,
  // which can never overflow because it's never negative.
  toggleButton: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 10
  },
  // Same shape as toggleButton, `flex: 1` instead of its own width - two of these side by side in
  // toggleRow share the row's own edge alignment instead of each carrying their own.
  toggleButtonInRow: {
    borderRadius: 12,
    flex: 1,
    overflow: 'hidden',
    paddingVertical: 10
  },
  toggleContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  toggleGroup: {
    gap: 4
  },
  // No horizontal margin of its own now either - see toggleButton's identical note.
  toggleRow: {
    flexDirection: 'row',
    gap: 4
  }
})
