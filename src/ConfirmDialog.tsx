import { useAutoPaperTheme } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { toRotationStyle, type ViewRotation } from '@tastic/core'
import { type ReactNode, useEffect, useRef } from 'react'
import { BackHandler, StyleSheet, View } from 'react-native'
import { Portal, Text } from 'react-native-paper'

import { DialogHeader } from './DialogHeader'
import { overlayActionStyles } from './overlayCard'
import { OverlayBackdrop, OverlayCard, useOverlayCardColors } from './OverlaySurface'
import { useCompactDialog } from './useCompactDialog'

export interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  // Live physical-hold rotation (see @tastic/core's getViewRotation) - same convention as
  // BaseSettingsDialog's own rotation prop; defaults to 0 for a caller with no per-player zone to
  // match (a portrait-only or single-player game has nothing to stay consistent with).
  rotation?: ViewRotation
  // Any react-native-paper Icon `source` name, shown in the header (DialogHeader) - defaults to a
  // plain question mark, since this component has no way to know why a caller is asking.
  icon?: string
  // Whether the confirm button reads as destructive (the fleet's shared `danger` semantic role)
  // instead of the default primary-colored affirmative action.
  destructive?: boolean
}

// A themed replacement for the native Alert.alert/window.confirm two-button confirm pattern, the same
// card BaseSettingsDialog's own update-check info messages use (see its onInfo/infoMessage),
// generalized into its own reusable, exported component for any caller that needs a real yes/no
// decision instead of a single OK dismissal. The card and backdrop come from OverlaySurface.tsx: the
// theme's raised surface, blurred when the player's Blur setting allows it. A backdrop + centered
// card, not react-native-paper's own Dialog (which BaseSettingsDialog uses instead) -
// this renders identically on every platform, including web, where react-native-web's Alert.alert
// is a hard no-op (confirmed: its entire implementation is `static alert() {}`) and Dialog's own
// Portal-based positioning has its own web quirks BaseSettingsDialog already works around.
export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, rotation = 0, icon = 'help-circle-outline', destructive = false }: ConfirmDialogProps) {
  const { colors } = useAutoPaperTheme()
  const { fg } = useOverlayCardColors()
  const { compact, onLayout } = useCompactDialog(rotation)

  // Android's back means Cancel while the dialog is up. It's a Portal over a View, not a Modal, so
  // nothing else catches the press: it would fall through to whatever is underneath (the router, or a
  // screen's own back listener) and close that screen with the dialog still up. RN calls the newest
  // listener first, and this one is added when the dialog opens. Always consumed, even with no
  // onCancel: a dialog with only a confirm button has to be answered, not backed out from under.
  //
  // onCancel goes through a ref (kept current after every commit, the useQuitConfirmation idiom) so the
  // listener is added once per opening. Callers pass a new arrow each render, and re-adding the
  // listener on each would move it to the top of the stack, ahead of anything opened above it since.
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })
  useEffect(() => {
    if (!visible) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancelRef.current?.()
      return true
    })
    return () => subscription.remove()
  }, [visible])

  if (!visible) return null

  const accent = destructive ? colors.danger : colors.primary
  const onAccent = destructive ? colors.onDanger : colors.onPrimary
  const showCancel = cancelLabel !== undefined && onCancel !== undefined

  return (
    <Portal>
      <OverlayBackdrop style={styles.overlay} onLayout={onLayout}>
        <OverlayCard style={[styles.card, toRotationStyle(rotation)]}>
          <DialogHeader icon={icon} title={title} color={accent} compact={compact} />
          <Text variant='bodyLarge' style={[styles.body, { color: fg }]}>
            {message}
          </Text>
          <View style={overlayActionStyles.actions}>
            {showCancel && (
              <Button mode='outlined' onPress={onCancel} style={overlayActionStyles.actionButton}>
                {cancelLabel}
              </Button>
            )}
            <Button mode='contained' onPress={onConfirm} style={showCancel ? overlayActionStyles.actionButton : overlayActionStyles.actionButtonSingle} buttonColor={accent} textColor={onAccent}>
              {confirmLabel}
            </Button>
          </View>
        </OverlayCard>
      </OverlayBackdrop>
    </Portal>
  )
}

const styles = StyleSheet.create({
  body: {
    textAlign: 'center'
  },
  // Additive on top of overlayCard's own shared `card` shape (borderRadius/borderWidth/gap/maxWidth/
  // padding) - claims its full allowance instead of just maxWidth alone, which only caps how wide the
  // card is allowed to get - without an explicit width, a flex-centered child sizes to its own content
  // instead of stretching, so the card (and therefore actions below) can end up narrower than the
  // screen actually has room for, needlessly forcing the action row to wrap sooner than it has to.
  card: {
    width: '100%'
  },
  // Additive on top of overlayCard's own shared `overlay` backdrop - gives the card room to breathe
  // from the screen edges now that it reliably stretches to fill its full width allowance (see
  // card's own width comment) - without this, width: '100%' would run the card edge-to-edge on a
  // screen narrower than maxWidth's own 360.
  overlay: {
    paddingHorizontal: 24
  }
})
