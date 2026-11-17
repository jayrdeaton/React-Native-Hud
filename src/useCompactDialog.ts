import { useCallback, useState } from 'react'
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native'

import { isCompactDialogHeight } from './DialogHeader'

// Whether a dialog should use the compact header, and the onLayout to put on its OverlayBackdrop. The
// backdrop fills whatever the dialog lays out in, so its measured height is the real answer: a game
// frame or the app's root. Before that first layout it guesses the window's.
export function useCompactDialog(): { compact: boolean; onLayout: (e: LayoutChangeEvent) => void } {
  const window = useWindowDimensions()
  const [measured, setMeasured] = useState<number | null>(null)
  const onLayout = useCallback((e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.height), [])
  return { compact: isCompactDialogHeight(measured ?? window.height), onLayout }
}
