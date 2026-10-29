// The loadout entry point (`@tastic/hud/lobby`): the pieces a two-seat loadout or lobby screen is built
// from, reachable without the main barrel, whose TriggerGaugeHost and loadSkiaWeb reach Skia.
// @tastic/shell's loadout is why it exists: the shell is one barrel, so every app on it loads the
// loadout, and CardTastic (Solitaire, renamed) has no Skia. Unlike `./chrome`, this entry may use
// @tastic/profile (PlayerSetupPanel's pickers) and @tastic/split-screen (useZoneClampedAlign), neither
// of which loads Skia. Everything reachable from this file must stay free of Skia and of the main barrel.
// SectionedDropdown stays out (TriggerGaugeHost), which is why MenuOption has a module of its own.
// src/__tests__/lobbyImports.test.ts walks the real import graph from here and enforces all of it.
export { type MenuOption } from '../menuOption'
export { getColorPopoverId, getCpuDifficultyPopoverId, getProfilePopoverId, PlayerSetupPanel, type PlayerSetupPanelProps } from '../PlayerSetupPanel'
export { ReadyButton } from '../ReadyButton'
export { SharedActionBand } from '../SharedActionBand'
export { useZoneClampedAlign } from '../useZoneClampedAlign'
