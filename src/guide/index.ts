// The how-to-play entry point (`@tastic/hud/guide`) — a standalone build reachable without ever
// touching the main barrel, the same reason `@tastic/hud/skia-gate` is. This file and everything it
// imports must stay free of @tastic/core, @tastic/profile, @tastic/split-screen, @tastic/achievements,
// @rific/updater and Skia: those are optional peers of this package (see package.json's
// peerDependenciesMeta) precisely so an app like Hangman, which has none of them, can install
// @tastic/hud and use only this. src/__tests__/guideImports.test.ts enforces it.
export { type DirectionKeyLabels, type DirectionKeysAxis, DirectionKeysHint, type DirectionKeysHintProps } from './DirectionKeysHint'
export { GuideProvider, type GuideProviderProps, useAutoShowGuide, useGuide } from './GuideProvider'
export { createGuideSlice, createReturningPlayerMigrate, type GuideAction, type GuidePersistedState, type GuideSlice, type GuideSliceOptions, type GuideState, type GuideStorageReader } from './guideSlice'
export { getGuideCardSize, HowToPlayDialog, type HowToPlayDialogProps } from './HowToPlayDialog'
export { type SeatDevice, SeatDevicesHint, type SeatDevicesHintProps } from './SeatDevicesHint'
export { SeatDiagram, type SeatDiagramProps } from './SeatDiagram'
export { type SwipeDirection, SwipeHint, type SwipeHintProps, type SwipePointer } from './SwipeHint'
export type { GuideRotation, GuideStep } from './types'
