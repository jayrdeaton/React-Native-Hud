import { Button, type ButtonProps } from '@rific/feedback-press'

import { overlayActionStyles } from './overlayCard'
import { useOverlayCardColors } from './OverlaySurface'

export type SecondaryButtonProps = ButtonProps

// The secondary action on an overlay card's action row (Cancel, Skip, Back, a result card's Quit):
// outlined, labeled in the card's own text color (fg) rather than Paper's default (the theme's
// primary), and sized as one of the row's buttons. A secondary takes no theme or seat color, so a
// seat's card never shows another seat's color and the contained primary beside it is the only
// colored button (Jay, 2026-10-20). Every prop overrides those defaults (a `style` is laid over the
// row's button style).
export function SecondaryButton({ style, ...props }: SecondaryButtonProps) {
  const { fg } = useOverlayCardColors()
  return <Button mode='outlined' textColor={fg} {...props} style={[overlayActionStyles.actionButton, style]} />
}
