// The fleet-chrome entry point (`@tastic/hud/chrome`): the shared dialogs, stats screen pieces, corner
// buttons, popover primitives, color picker and style tokens, reachable without the main barrel, for an
// app that has none of its heavy peers. Hangman is the reason it exists: it has @tastic/core,
// @rific/updater and the Paper stack, but no Skia, no @tastic/profile and no @tastic/split-screen. The
// popover pieces (PopoverBody, PressAwayOverlay, usePopoverHost, useAutoAlign) and InlineColorPicker are
// here for @tastic/profile 0.16+, which imports them from this entry instead of the main barrel so its
// ProfilePicker and ProfilesScreen work in Hangman. Everything reachable from this file must stay free of
// those three and of the main barrel; @tastic/achievements may appear only as `import type`.
// AchievementUnlockList is left out on purpose because it value-imports @tastic/profile's ProfileChip.
// src/__tests__/chromeImports.test.ts walks the real import graph from here and enforces all of it.
export { AchievementCatalogSection } from '../AchievementCatalogSection'
export { AchievementRow, LOCKED_BADGE_COLOR } from '../AchievementRow'
export { ActivityStatSection } from '../ActivityStatSection'
export { BaseSettingsDialog, type BaseSettingsDialogProps } from '../BaseSettingsDialog'
export { BaseStatsScreen } from '../BaseStatsScreen'
export { ConfirmDialog, type ConfirmDialogProps } from '../ConfirmDialog'
export { ContentGutter } from '../ContentGutter'
export { CornerActionButtons } from '../CornerActionButtons'
export { COMPACT_DIALOG_HEIGHT, DialogHeader, type DialogHeaderProps, isCompactDialogHeight } from '../DialogHeader'
export { MONO_FONT } from '../fonts'
export { getInlineColorPickerContentSize, InlineColorPicker, type InlineColorPickerSwatchPlace, type InlineColorPickerSwatchRenderer } from '../InlineColorPicker'
export { overlayActionStyles, overlayStyles } from '../overlayCard'
export { OverlayBackdrop, type OverlayBackdropProps, OverlayCard, type OverlayCardProps, type OverlayCardThemeColors, useOverlayCardColors } from '../OverlaySurface'
export { PopoverBody } from '../PopoverBody'
export { PressAwayOverlay } from '../PressAwayOverlay'
export { RotatedFrame, type RotatedFrameProps } from '../RotatedFrame'
export { SecondaryButton, type SecondaryButtonProps } from '../SecondaryButton'
export { getStaggeredWordDuration, StaggeredWord, type StaggeredWordProps } from '../StaggeredWord'
export { StatRow } from '../StatRow'
export { StatSection } from '../StatSection'
export { UpdateDialog, type UpdateDialogProps } from '../UpdateDialog'
export { type AlignResult, type PopoverAlign, type PopoverRotation, type PopoverVerticalAlign, useAutoAlign, type ViewInstance } from '../useAutoAlign'
export { useCompactDialog } from '../useCompactDialog'
export { type PopoverHost, usePopoverHost } from '../usePopoverHost'
export { useWellColors, WELL_SHADOW, type WellColors } from '../wellSurface'
