import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { StyleSheet, View } from 'react-native'
import { Icon, Portal, Text } from 'react-native-paper'

export interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  // Live physical-hold rotation (see @tastic/split-screen's getViewRotation) - same convention as
  // BaseSettingsDialog's own rotation prop; defaults to 0 for a caller with no per-player zone to
  // match (a portrait-only or single-player game has nothing to stay consistent with).
  rotation?: number
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

  // High-contrast retro look: literal black/white by appearance, not auto-paper's own (slightly
  // tinted) background role - same convention BaseSettingsDialog's own overlay card uses.
  const fg = dark ? '#FFFFFF' : '#000000'
  const cardBg = dark ? '#111111' : '#F2F2F2'
  const cardBorder = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
  const accent = destructive ? colors.danger : colors.primary
  const onAccent = destructive ? colors.onDanger : colors.onPrimary

  return (
    <Portal>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, rotation % 360 !== 0 && { transform: [{ rotate: `${rotation}deg` }] }]}>
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
  actionButton: {
    flex: 1
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  body: {
    textAlign: 'center'
  },
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
  },
  title: {
    fontWeight: 'bold'
  }
})
