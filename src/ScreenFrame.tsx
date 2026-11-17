import { type ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Portal } from 'react-native-paper'

export interface ScreenFrameProps {
  children: ReactNode
  /** Mount a Paper Portal.Host INSIDE the frame, so a dialog (Paper's Portal otherwise mounts at the nearest host
   * above, usually the app root) is laid out in the frame instead. */
  portalHost?: boolean
  /** Let touches fall through the frame to whatever is beneath it, so only its children claim them. For a frame
   * laid OVER other content (a dialog layer, a root-level overlay); a screen that owns the window leaves it off. */
  passThrough?: boolean
  /** Cap on the content column's width in a landscape window only, centred: a stats list or a roster stretched
   * across an 874pt-wide landscape screen reads badly. Portrait is never capped, so a portrait iPad or desktop
   * window keeps its full width. Omit for no cap. */
  maxContentWidth?: number
}

/** A frame that fills its parent: `View > [Portal.Host] > column`. `passThrough` and `maxContentWidth` only change
 * styles, but `portalHost` adds or removes the Portal.Host element, so it must be STATIC per call site (flipping it
 * at runtime would remount everything inside). */
export function ScreenFrame({ children, portalHost = false, passThrough = false, maxContentWidth }: ScreenFrameProps) {
  const { width, height } = useWindowDimensions()
  const cappedWidth = maxContentWidth !== undefined && width > height ? maxContentWidth : undefined
  const pointerEvents = passThrough ? 'box-none' : undefined
  const column = (
    <View style={[styles.column, cappedWidth !== undefined && { maxWidth: cappedWidth }]} pointerEvents={pointerEvents}>
      {children}
    </View>
  )

  return (
    <View style={styles.root} pointerEvents={pointerEvents}>
      {portalHost ? <Portal.Host>{column}</Portal.Host> : column}
    </View>
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
