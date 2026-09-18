export { AchievementCatalogSection } from './AchievementCatalogSection'
export { AchievementRow, LOCKED_BADGE_COLOR } from './AchievementRow'
export { ActivityStatSection } from './ActivityStatSection'
export { BaseSettingsDialog, type BaseSettingsDialogProps } from './BaseSettingsDialog'
export { BaseStatsScreen } from './BaseStatsScreen'
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'
export { ContentGutter } from './ContentGutter'
export { ControlSchemePicker, type ControlSchemePickerProps } from './ControlSchemePicker'
export { CornerActionButtons } from './CornerActionButtons'
export { CornerStatusBadges, type CornerStatusBadgeSeat, type CornerStatusBadgesProps, type OrientationMode } from './CornerStatusBadges'
export { MONO_FONT } from './fonts'
export { getInlineColorPickerContentSize, InlineColorPicker } from './InlineColorPicker'
export { getLabeledDropdownContentHeight, LABELED_DROPDOWN_POPOVER_WIDTH, LabeledDropdown, type LabeledDropdownOption } from './LabeledDropdown'
export { loadSkiaWeb } from './loadSkiaWeb'
export { getOverlayCardColors, type OverlayCardColors, overlayStyles } from './overlayCard'
export { getColorPopoverId, getCpuDifficultyPopoverId, PlayerSetupPanel, type PlayerSetupPanelProps } from './PlayerSetupPanel'
export { PopoverBody } from './PopoverBody'
export { PressAwayOverlay } from './PressAwayOverlay'
export { ReadyButton } from './ReadyButton'
export { type MenuOption, type MenuSection, type MultiSelectSection, SectionedDropdown, type SingleSelectSection } from './SectionedDropdown'
export { SharedActionBand } from './SharedActionBand'
export { SkiaGate, type SkiaGateProps } from './SkiaGate'
export { getStaggeredWordDuration, StaggeredWord, type StaggeredWordProps } from './StaggeredWord'
export { StatRow } from './StatRow'
export { StatSection } from './StatSection'
// TriggerGauge itself (the raw Skia-based component) is deliberately NOT exported here, even
// though a native-only consumer could safely skip TriggerGaugeHost's SkiaGate indirection. A
// value re-export forces the bundler to fold TriggerGauge.tsx's own `Skia` import into a chunk
// that this entry point imports eagerly at the top level — since that chunk is then shared with
// TriggerGaugeHost's own dynamic import too, it defeats TriggerGaugeHost's deferred loading for
// every consumer, on every platform, not just the ones reaching for the raw component.
// TriggerGaugeHost is the only supported way to render this.
export type { TriggerGaugeProps } from './TriggerGauge'
export { default as TriggerGaugeHost } from './TriggerGaugeHost'
export { UpdateDialog, type UpdateDialogProps } from './UpdateDialog'
export { type AlignResult, type PopoverAlign, type PopoverRotation, type PopoverVerticalAlign, useAutoAlign } from './useAutoAlign'
export { type PopoverHost, usePopoverHost } from './usePopoverHost'
export { type QuitConfirmation, useQuitConfirmation } from './useQuitConfirmation'
export { useZoneClampedAlign } from './useZoneClampedAlign'
