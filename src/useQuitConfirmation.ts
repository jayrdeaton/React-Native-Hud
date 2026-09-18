import { useCallback, useEffect, useRef, useState } from 'react'

export interface QuitConfirmation {
  /** Wire directly to <ConfirmDialog visible={...}>. */
  confirmVisible: boolean
  /** Wire directly to the back button's onPress (GameActionChips/IconButton onBack/onPress). */
  requestBack: () => void
  /** Wire directly to <ConfirmDialog onCancel={...}>. */
  cancelBack: () => void
}

// Captures the onBackPress + ConfirmDialog "Quit Match?" pattern every fleet game.tsx already
// hand-wires (Snake, AirHockey, BoxHockey, Pong, LightCycles): interrupt backing out of a match
// with a confirmation only when there's something worth losing, otherwise back out immediately.
//
// `hasProgress` is a lazy () => boolean, not a plain boolean value taken directly - deliberately
// corrected from this hook's own first version, which took a plain boolean and broke in practice
// for AirHockey/BoxHockey/Pong: `paused` (derived from this hook's own confirmVisible) has to be
// computed and handed to useGameState() BEFORE that call returns the very scores/lives/bricks state
// hasProgress needs to read, so a plain-boolean argument creates a real render-order circular
// dependency (confirmVisible -> paused -> useGameState -> state -> hasProgress -> confirmVisible).
// All three apps independently worked around this with their own bespoke shadow-state ("read last
// render's value, one commit behind"), converging on the same fix by three different names - a sign
// the hook's own contract was wrong, not that each call site needed its own patch. A lazy getter
// breaks the cycle by deferring the read to requestBack's own call time, exactly mirroring how the
// pre-extraction, hand-rolled version of this pattern in every app read scores/bricks/lives fresh
// from its own onBackPress closure rather than needing the value available earlier in the render.
//
// Mirrored into a ref via this fleet's standard effect-based idiom (useEffect with no dependency
// array, not a bare render-time assignment - see @rific/core's createSettingsContext.tsx for the
// same convention) rather than read directly, so a stale closure from an earlier render is never
// what requestBack ends up calling. This also gives requestBack/cancelBack a stable identity across
// every render (empty deps arrays), which the original plain-boolean version couldn't offer.
//
// Deliberately does NOT own or render a <ConfirmDialog> - title/message/icon/confirmLabel/
// cancelLabel/rotation are all still game-specific (a score pairing, a lives/bricks count, a
// round-history pip row) and stay authored at each call site; this only owns the open/closed
// state and the "should this even ask" gate. onConfirmedBack is a plain callback (every current
// caller passes its own app's safeBack from @/utils/navigation) rather than hardcoded, so this
// package takes on no expo-router dependency.
export function useQuitConfirmation(hasProgress: () => boolean, onConfirmedBack: () => void): QuitConfirmation {
  const [confirmVisible, setConfirmVisible] = useState(false)

  const hasProgressRef = useRef(hasProgress)
  useEffect(() => {
    hasProgressRef.current = hasProgress
  })
  const onConfirmedBackRef = useRef(onConfirmedBack)
  useEffect(() => {
    onConfirmedBackRef.current = onConfirmedBack
  })

  const requestBack = useCallback(() => {
    if (hasProgressRef.current()) setConfirmVisible(true)
    else onConfirmedBackRef.current()
  }, [])

  const cancelBack = useCallback(() => setConfirmVisible(false), [])

  return { confirmVisible, requestBack, cancelBack }
}
