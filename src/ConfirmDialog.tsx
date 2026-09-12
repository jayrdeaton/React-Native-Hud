import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { toRotationStyle, type ViewRotation } from '@tastic/core'
import { StyleSheet, View } from 'react-native'
import { Icon, Portal, Text } from 'react-native-paper'

import { getOverlayCardColors, overlayStyles } from './overlayCard'

export interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  // Live physical-hold rotation (see @tastic/core's getViewRotation) - same convention as
  // BaseSettingsDialog's own rotation prop; defaults to 0 for a caller with no per-player zone to
  // match (a portrait-only or single-player game has nothing to stay consistent with).
  rotation?: ViewRotation
  // Any react-native-paper Icon `source` name, shown above the title - defaults to a plain
  // question mark, since this component has no way to know why a caller is asking.
  icon?: string
  // Whether the confirm button reads as destructive (the fleet's shared `danger` semantic role)
  // instead of the default primary-colored affirmative action.
  destructive?: boolean
}

// A themed replacement for the native Alert.alert/window.confirm two-button confirm pattern - the
// same "retro card overlay" look BaseSettingsDialog's own update-check info messages already use
// (see its onInfo/infoMessage), generalized here into its own reusable, exported component for any
// caller that needs a real yes/no decision instead of a single OK dismissal. A solid backdrop +
// centered card, not react-native-paper's own Dialog (which BaseSettingsDialog uses instead) -
// this renders identically on every platform, including web, where react-native-web's Alert.alert
// is a hard no-op (confirmed: its entire implementation is `static alert() {}`) and Dialog's own
// Portal-based positioning has its own web quirks BaseSettingsDialog already works around.
export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, rotation = 0, icon = 'help-circle-outline', destructive = false }: ConfirmDialogProps) {
  const { dark, colors } = useAutoPaperTheme()
  if (!visible) return null

  const { fg, cardBg, cardBorder } = getOverlayCardColors(dark)
  const accent = destructive ? colors.danger : colors.primary
  const onAccent = destructive ? colors.onDanger : colors.onPrimary

  return (
    <Portal>
      <View style={[overlayStyles.overlay, styles.overlay]}>
        <View style={[overlayStyles.card, styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, toRotationStyle(rotation)]}>
          <Icon source={icon} size={64} color={accent} />
          <Text variant='headlineLarge' style={[styles.title, { color: accent }]}>
            {title}
          </Text>
          <Text variant='bodyLarge' style={[styles.body, { color: fg }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            <Button mode='outlined' onPress={onCancel} style={styles.actionButton}>
              {cancelLabel}
            </Button>
            <Button mode='contained' onPress={onConfirm} style={styles.actionButton} buttonColor={accent} textColor={onAccent}>
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Portal>
  )
}

const styles = StyleSheet.create({
  // flexBasis (not flex: 1's own 0%) is each button's real floor: whenever both fit side by side,
  // flexGrow still splits any leftover width evenly beyond that floor, same visual result as the
  // old flex: 1 on a roomy screen - but a button can never be squeezed narrower than 128, only
  // wrap to its own row instead (see actions' flexWrap below). react-native-paper's Button
  // hardcodes numberOfLines={1} on its label with no override, so a button squeezed under its
  // label's natural width silently ellipsizes ("Cancel" -> "Can...") instead of wrapping - assumed
  // fixable by just giving the row more width, until confirmed live that these two-word labels
  // (Cancel/Reset/New Game) can still lose the truncation fight even with the extra room card's own
  // width fix below provides, on a narrow enough screen. flexBasis is the real fix: past a certain
  // width there's no side-by-side arrangement that fits both buttons at their natural label size,
  // so the layout has to give (stack) rather than the label (truncate).
  actionButton: {
    flexBasis: 128,
    flexGrow: 1
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%'
  },
  body: {
    textAlign: 'center'
  },
  // Additive on top of overlayCard's own shared `card` shape (borderRadius/borderWidth/gap/maxWidth/
  // padding) — claims its full allowance instead of just maxWidth alone, which only caps how wide the
  // card is allowed to get - without an explicit width, a flex-centered child sizes to its own content
  // instead of stretching, so the card (and therefore actions below) can end up narrower than the
  // screen actually has room for, needlessly forcing the action row to wrap sooner than it has to.
  card: {
    width: '100%'
  },
  // Additive on top of overlayCard's own shared `overlay` backdrop — gives the card room to breathe
  // from the screen edges now that it reliably stretches to fill its full width allowance (see
  // card's own width comment) - without this, width: '100%' would run the card edge-to-edge on a
  // screen narrower than maxWidth's own 360.
  overlay: {
    paddingHorizontal: 24
  },
  // textAlign is load-bearing, not decorative, once `title` wraps to more than one line - centered
  // within card's own alignItems: 'center' only centers the Text's block as a whole; each wrapped
  // line inside that block still defaults to left-aligned without this.
  title: {
    fontWeight: 'bold',
    textAlign: 'center'
  }
})
