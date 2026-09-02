import { IconButton } from '@rific/feedback-press'
import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

interface Props {
  onBack: () => void
  onSettings: () => void
  // Optional, and expected to be passed together in practice (either a screen has both a randomize
  // and a reset action, or neither) — kept as two independently-optional props rather than one pair
  // flag so a caller with only one of the two isn't forced to fake the other.
  onRandomize?: () => void
  onReset?: () => void
  fg: string
  // Whether one of THIS band's own popovers (i.e. something rendered inside `children`) is
  // currently open — the caller computes this (typically `host.openId !== null &&
  // OWN_IDS.includes(host.openId)`), since only the caller knows which popover ids belong to its
  // own children. Elevates the whole column above sibling panels when true — React Native Web gives
  // every position:'relative' view its own stacking context, so a popover escaping `children` needs
  // this wrapper itself elevated, not just the popover content, to paint above a later sibling
  // (e.g. a player panel) rather than underneath it.
  popoverOpen: boolean
  // The screen's own per-round option row (grid size, arena, etc.) — rendered directly below the
  // action row, inside the same elevating column.
  children: ReactNode
}

// The reachability fix for a two-player screen where the plain top-left/top-right corners (see
// CornerActionButtons) would land inside one player's own rotated zone — most concretely, two-
// player face-to-face, where the far player's zone always covers the top half of the screen. Folds
// back/randomize/reset/settings into one row that sits on neutral ground instead (the shared band
// between the two players' zones), directly above the caller's own per-round option row. The
// caller decides *when* this applies (it owns gameMode/orientationMode) — this component only
// renders the result once that decision's already been made.
export function SharedActionBand({ onBack, onSettings, onRandomize, onReset, fg, popoverOpen, children }: Props) {
  return (
    <View style={[styles.column, popoverOpen && styles.columnOpen]}>
      <View style={styles.actionsRow}>
        <IconButton icon='arrow-left' iconColor={fg} size={20} onPress={onBack} accessibilityLabel='Back' />
        {onRandomize && <IconButton icon='dice-multiple' iconColor={fg} size={18} onPress={onRandomize} accessibilityLabel='Randomize match settings' />}
        {onReset && <IconButton icon='restore' iconColor={fg} size={18} onPress={onReset} accessibilityLabel='Reset match settings to defaults' />}
        <IconButton icon='cog' iconColor={fg} size={20} onPress={onSettings} accessibilityLabel='Settings' />
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16
  },
  column: {
    alignItems: 'center',
    gap: 8
  },
  columnOpen: {
    zIndex: 100
  }
})
