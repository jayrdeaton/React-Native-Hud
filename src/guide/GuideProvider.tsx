import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { HowToPlayDialog } from './HowToPlayDialog'
import type { GuideRotation, GuideStep } from './types'

interface GuideContextValue {
  isOpen: boolean
  // Opens the guide unconditionally — the Settings "How to play" row's whole job. Never persists
  // anything on its own: only finishing or skipping does, and only while the player hasn't already
  // seen this version.
  open: () => void
  close: () => void
  // Opens it once per session, and only if this player hasn't seen `currentVersion` yet — see
  // useAutoShowGuide.
  requestAutoShow: () => void
}

const noop = () => {}

// A default that does nothing rather than throwing when there's no provider above — an app's own
// existing tests render its Settings dialog or Home screen without one, and a "How to play" row that
// silently does nothing in that harness is a far better failure than every such test breaking.
const GuideContext = createContext<GuideContextValue>({ isOpen: false, open: noop, close: noop, requestAutoShow: noop })

export interface GuideProviderProps {
  steps: GuideStep[]
  // Bumped by the app only for a genuine controls/rules change, to re-prompt everyone.
  currentVersion: number
  // Read from the app's own persisted store (see createGuideSlice's selectVersionSeen).
  seenVersion: number
  // Called with `currentVersion` when the player finishes or skips a guide they hadn't seen yet.
  onSeen: (version: number) => void
  // The app's live fake-landscape rotation (see GuideRotation). The card rotates and sizes itself for it.
  rotation?: GuideRotation
  children?: ReactNode
}

// Mounted once at the app root, next to <UpdateDialog /> — the fleet's existing "self-presenting
// app-level dialog" seat — so any screen can open it through useGuide() without prop-drilling, and
// the Portal it renders sits above every route. Inside PersistGate, so `seenVersion` is already the
// rehydrated value by the time this first renders.
export function GuideProvider({ steps, currentVersion, seenVersion, onSeen, rotation, children }: GuideProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  // Once per session, not once per Home mount — Home remounts every time the player backs out of a
  // match, and skipping shouldn't be something they have to do again a minute later just because the
  // persisted flag hadn't been written back through the store yet.
  const autoShownRef = useRef(false)
  const unseen = seenVersion < currentVersion

  const open = useCallback(() => setIsOpen(true), [])

  const close = useCallback(() => {
    setIsOpen(false)
    if (unseen) onSeen(currentVersion)
  }, [unseen, onSeen, currentVersion])

  const requestAutoShow = useCallback(() => {
    if (!unseen || autoShownRef.current) return
    autoShownRef.current = true
    setIsOpen(true)
  }, [unseen])

  const value = useMemo(() => ({ isOpen, open, close, requestAutoShow }), [isOpen, open, close, requestAutoShow])

  return (
    <GuideContext.Provider value={value}>
      {children}
      <HowToPlayDialog visible={isOpen} steps={steps} onFinish={close} onSkip={close} rotation={rotation} />
    </GuideContext.Provider>
  )
}

export function useGuide(): GuideContextValue {
  return useContext(GuideContext)
}

// Call this from the Home screen and nowhere else — that placement, not any route check in here, is
// what keeps it from ever firing over a live match or a two-seat loadout. Home is the one screen
// with a single reader, before any seating, so a face-to-face two-player phone doesn't need per-seat
// rotated copies of the card. `enabled` lets a caller hold it back (e.g. while a shared-link import
// is being handled) without breaking the rules of hooks by conditionally calling this.
export function useAutoShowGuide(enabled = true) {
  const { requestAutoShow } = useGuide()
  useEffect(() => {
    if (enabled) requestAutoShow()
  }, [enabled, requestAutoShow])
}
