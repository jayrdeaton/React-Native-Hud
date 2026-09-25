import type { ReactNode } from 'react'

// One card of a game's how-to-play flow. Content is app-local data, not something this package
// authors: only the app knows its own controls, its own key schemes on desktop web, its own win
// condition. `art` is whatever illustrates the idea — a `SwipeHint`/`SeatDiagram` from this same
// entry point, or anything the app draws itself (plain Views + Reanimated keeps it renderer-free).
export interface GuideStep {
  title: string
  body: string
  art?: ReactNode
}

// The fleet's fake-landscape rotation (structurally @tastic/core's ViewRotation, restated here so this
// entry point never imports @tastic/core). Pass the app's LIVE rotation (useRotation/getViewRotation):
// the guide renders in the app-root Portal host, outside any rotated screen, so it turns itself.
export type GuideRotation = 0 | 90 | 180 | -90
