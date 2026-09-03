import { computeContentBounds } from '@tastic/core'
import { ReactNode } from 'react'
import { StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native'

interface Props {
  // Upper bound on the centered content region's width, in px. Omitted (the default) means no
  // clamp at all - content fills the full window width and both gutters stay at 0 - the right
  // default for a caller that wants this component's centered-content structure without ever
  // actually capping width (e.g. a future full-bleed/"extend into safe area"-style mode: just
  // don't pass this prop for that mode, rather than needing a separate disable flag).
  maxContentWidth?: number
  // Decoration for the left/right leftover space once maxContentWidth actually clamps something -
  // e.g. a boundary wall. Each renders inside a View already sized to that side's own
  // gutterWidth (0, and so with no room to show in, whenever nothing's clamped) - omit either/both
  // for plain empty space, the default.
  leftGutter?: ReactNode
  rightGutter?: ReactNode
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

// Caps a game's play area at maxContentWidth on a wide desktop/web window, splitting whatever's
// left over into two equal, empty-by-default gutters instead of letting content keep stretching
// (or drift off-center, left-anchored inside a now-much-wider parent) past the point where growing
// any further stops being useful. Below maxContentWidth - or with it omitted entirely - this is a
// no-op passthrough: children render at the full window width, no gutters.
//
// See @tastic/core's computeContentBounds for the actual clamp math this just wires up to a live
// useWindowDimensions() read - deliberately the only geometry source this component owns itself; a
// caller that also needs to fold in device safe-area insets or a split-screen zone boundary
// composes those together on its own side, the same way LightCycles' useZoneClampedAlign composes
// useAutoAlign with its own extra geometry (see that hook for the pattern this follows).
export function ContentGutter({ maxContentWidth, leftGutter, rightGutter, style, children }: Props) {
  const { width: windowWidth } = useWindowDimensions()
  const { contentWidth, gutterWidth } = computeContentBounds(windowWidth, maxContentWidth ?? Infinity)

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.gutter, { width: gutterWidth }]}>{leftGutter}</View>
      <View style={{ width: contentWidth }}>{children}</View>
      <View style={[styles.gutter, { width: gutterWidth }]}>{rightGutter}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row'
  },
  // overflow:'hidden' keeps an oversized leftGutter/rightGutter from bleeding into the content
  // column instead of clipping cleanly at its own real width.
  gutter: {
    overflow: 'hidden'
  }
})
