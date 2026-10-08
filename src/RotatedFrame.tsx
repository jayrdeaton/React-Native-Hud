import { FakeLandscapeView, rotateDimensions, rotateInsets, useRotation, type ViewRotation } from '@tastic/core'
import { type ReactNode, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Portal } from 'react-native-paper'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'

export interface RotatedFrameProps {
  children: ReactNode
  /** The angle to turn the frame by. Defaults to the live physical hold (@tastic/core's useRotation); pass it
   * when the caller already has the exact angle it wants, e.g. a dialog handed its caller's rotation, or 0 for
   * one that already sits inside a turned frame. */
  rotation?: ViewRotation
  /** Give everything inside the frame the safe-area insets already remapped onto the frame's own edges (see
   * @tastic/core's rotateInsets), so a component that reads `useSafeAreaInsets()` itself (a library screen,
   * Paper's Modal, a toaster) lands on the right edge when the frame is turned. Leave it off for content that
   * rotates the insets itself, which would otherwise rotate them twice. */
  rotatedSafeArea?: boolean
  /** Mount a Paper Portal.Host INSIDE the frame, so a dialog (Paper's Portal otherwise mounts at the app root,
   * outside the frame) is laid out against the frame's footprint and turned with it. The dialog must then be
   * told `rotation={0}`. */
  portalHost?: boolean
  /** Let touches fall through the frame to whatever is beneath it, so only its children claim them. For a frame
   * laid OVER other content (a dialog layer, a root-level overlay); a screen that owns the window leaves it off. */
  passThrough?: boolean
  /** Cap on the content column's width in the WIDE layout only (the rotated footprint is landscape), centred: a
   * stats list or a roster stretched across an 874pt-wide landscape screen reads badly. Portrait is never capped,
   * so a portrait iPad or desktop window keeps its full width. Omit for no cap. */
  maxContentWidth?: number
}

/** A frame turned to follow the phone while the OS stays portrait-locked (see @tastic/core's FakeLandscapeView),
 * sized to the turned footprint so its content lays out against the short edge at +/-90. The tree is IDENTICAL
 * at every angle, so a rotation never remounts what is inside: `FakeLandscapeView > SafeArea provider >
 * [Portal.Host] > column`. `rotation`, `rotatedSafeArea`, `passThrough` and `maxContentWidth` only change styles
 * and values, but `portalHost` adds or removes the Portal.Host element, so it must be STATIC per call site
 * (flipping it at runtime would remount everything inside).
 *
 * Safe for tap-driven content only: react-native-gesture-handler's translation deltas are untransformed, so
 * never put a gesture-tracked game board inside it. */
export function RotatedFrame({ children, rotation: rotationOverride, rotatedSafeArea = false, portalHost = false, passThrough = false, maxContentWidth }: RotatedFrameProps) {
  const ambientRotation = useRotation()
  const rotation = rotationOverride ?? ambientRotation
  const window = useWindowDimensions()
  const { width, height } = rotateDimensions(window.width, window.height, rotation)
  const rawInsets = useSafeAreaInsets()
  const insets = useMemo(() => (rotatedSafeArea ? rotateInsets(rawInsets, rotation) : rawInsets), [rotatedSafeArea, rawInsets, rotation])
  const cappedWidth = maxContentWidth !== undefined && width > height ? maxContentWidth : undefined
  const column = (
    <View style={[styles.column, cappedWidth !== undefined && { maxWidth: cappedWidth }]} pointerEvents={passThrough ? 'box-none' : undefined}>
      {children}
    </View>
  )

  return (
    <FakeLandscapeView rotation={rotation} passThrough={passThrough} style={styles.root}>
      <SafeAreaInsetsContext.Provider value={insets}>{portalHost ? <Portal.Host>{column}</Portal.Host> : column}</SafeAreaInsetsContext.Provider>
    </FakeLandscapeView>
  )
}

const styles = StyleSheet.create({
  // A centred column: full width up to `maxWidth`, so a capped frame sits in the middle of a wider window.
  column: {
    alignSelf: 'center',
    flex: 1,
    width: '100%'
  },
  root: {
    flex: 1
  }
})
