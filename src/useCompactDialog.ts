import { useRotatedWindowDimensions, type ViewRotation } from '@tastic/core'
import { useCallback, useState } from 'react'
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native'

import { isCompactDialogHeight } from './DialogHeader'

// Whether a dialog should use the compact header, and the onLayout to put on its OverlayBackdrop. The
// backdrop fills whatever the dialog lays out in, so its measured size is the real answer: a turned
// game frame, an upright root, either one with a card that turns itself. Before that first layout it
// guesses: a dialog that turns itself (rotation ±90 or 180) sits at the root, in the upright window; one
// that doesn't sits in a frame the app has already turned by the live rotation.
export function useCompactDialog(rotation: ViewRotation = 0): { compact: boolean; onLayout: (e: LayoutChangeEvent) => void } {
  const window = useWindowDimensions()
  const framed = useRotatedWindowDimensions()
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null)
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setMeasured((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
  }, [])
  const box = measured ?? (rotation === 0 ? framed : window)
  const turned = rotation === 90 || rotation === -90
  return { compact: isCompactDialogHeight(turned ? box.width : box.height), onLayout }
}
