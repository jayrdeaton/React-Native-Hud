import { SeedColor } from '@rific/auto-paper'
import { getOptionPickerContentSize, getProfilePickerContentSize, OptionPicker, Profile, ProfilePicker, type ProfilePickerColorSection } from '@tastic/profile'
import { ReactNode } from 'react'
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'
import { Text } from 'react-native-paper'

import { InlineColorPicker } from './InlineColorPicker'
import { LabeledDropdownOption } from './LabeledDropdown'
import { ReadyButton } from './ReadyButton'
import { AlignResult, PopoverRotation } from './useAutoAlign'
import { PopoverHost, usePopoverHost } from './usePopoverHost'
import { useZoneClampedAlign } from './useZoneClampedAlign'

// This panel's own internal popover ids, derived from idPrefix - exported so a caller that needs to
// know whether one of them is currently open (e.g. to elevate the zone or row holding the panel)
// doesn't have to hardcode or guess this panel's own internal naming convention. Matches secondPickerId's own job for a caller's own
// externally-constructed picker - this is the equivalent for the two pickers this panel owns
// itself, which have no prop of their own to name their id with.
export function getColorPopoverId(idPrefix: string): string {
  return `${idPrefix}-color`
}
// The seat button's dropdown on a human seat (@tastic/profile's ProfilePicker opens under
// `${idPrefix}-profile`). A CPU seat's opens under getCpuDifficultyPopoverId.
export function getProfilePopoverId(idPrefix: string): string {
  return `${idPrefix}-profile`
}
export function getCpuDifficultyPopoverId(idPrefix: string): string {
  return `${idPrefix}-difficulty`
}

export interface PlayerSetupPanelProps<C extends string = string> {
  // Namespaces this panel's popover ids ('profile', 'difficulty', 'color', whatever secondPickerId names) so
  // two panels can safely share one host (see `host` below) without their ids colliding.
  idPrefix: string
  // Shared popover host, when this panel's own popovers should be mutually exclusive with another
  // panel's or a shared-controls row's (e.g. vs-CPU: only one human is ever driving both slots, so
  // having both YOU's and CPU's pickers open at once is just clutter, not a useful simultaneous-edit
  // case). Omit to fall back to this panel's own independent host - the two-player case, where two
  // real people editing at once is the point.
  host?: PopoverHost
  label?: string
  // Applied only to the plain `label` fallback text below (ProfilePicker/OptionPicker render
  // their own fixed chrome regardless of this prop) - omit to inherit whichever font the calling
  // screen's own theme resolves for a labelSmall Text, rather than this package forcing its own
  // MONO_FONT onto what's really the host app's own copy.
  labelFontFamily?: string
  color: string
  onColorChange: (hex: string) => void
  swatches: SeedColor[]
  // The other player's current color - stays visible in the swatch grid but disabled, rather than
  // removed from it entirely. Unless allowSwapTaken is set (the other seat is the CPU), which lets
  // it be picked so the caller can swap the two - see InlineColorPicker's own doc.
  takenColor?: string
  allowSwapTaken?: boolean
  // A short line under the seat button's Color row while a profile is selected, saying where the
  // color applies (e.g. 'Snake only': the pick is kept in this game, not on the profile). Left out
  // for a guest or the CPU, who have no color anywhere else.
  colorCaption?: string
  // False leaves the Color row out of the seat button's dropdown (e.g. a CPU seat set to "None",
  // with no second player to color). Defaults to true.
  showColor?: boolean
  // The fallback color swatch's placement and rotation, passed straight through to its
  // InlineColorPicker. That swatch is only drawn on a seat with neither a profile picker nor a CPU
  // difficulty picker (see the header below); the seat button places its own dropdown.
  colorAlignOverride?: AlignResult
  colorRotation?: PopoverRotation
  isHuman: boolean
  // Whatever sits under the seat button in pickerRow, if anything - a ControlSchemePicker, a raw
  // SectionedDropdown, or nothing at all. The five apps this component was extracted from each
  // duplicated this entire panel and differed only in what (if anything) occupied this one slot,
  // each wanting a genuinely different concept there (which physical input drives a seat, vs. a
  // pull/push "feel" preference, vs. no such concept at all for a game with no per-seat setting to
  // pick) - a ReactNode slot the caller renders its own picker into is what actually generalizes
  // across all of them, rather than this component baking in one shape (e.g. ControlSchemePicker's
  // own prop set) that most of its consumers don't need at all.
  secondPicker?: ReactNode
  // The popover id secondPicker opens under, if it opens one at all - lets pickerRow's own
  // "elevate above later siblings while one of my own popovers is open" logic (see pickerRowOpen)
  // react to secondPicker's popover the same way it already does for the fallback swatch's, without
  // this component needing any opinion on what secondPicker actually renders. Omit when secondPicker
  // has no popover of its own, or isn't provided at all.
  secondPickerId?: string
  ready?: boolean
  onToggleReady?: () => void
  dark: boolean
  // vs-CPU only has one human player, so some loadout screens render their Ready toggle standalone,
  // centered below both slots, instead of embedded in this panel.
  showReadyButton?: boolean
  profiles?: Profile[]
  selectedProfileId?: string | null
  takenProfileId?: string | null
  // What the seat button shows before any profile's selected - this seat's own 'P1'/'P2' (see
  // ProfilePicker's own doc for why it's never "Player"). Required whenever profiles is provided,
  // since the trigger always needs some idle text.
  guestLabel?: string
  // The no-profile row's label in the seat button's dropdown (ProfilePicker's `nullLabel`), e.g.
  // 'Guest' for a seat whose button reads 'GUEST' (guestLabel) until a profile is picked. Unset is
  // ProfilePicker's own default.
  nullLabel?: string
  onProfileSelect?: (profile: Profile | null) => void
  // Navigates to a profile-management screen - typically only ever wired up for one seat (a rotated
  // second zone often can't host a working text keyboard).
  onManageProfiles?: () => void
  // Generic over the calling app's own CPU-difficulty union, matching LabeledDropdownOption<T>'s own
  // genericness - this package has no opinion on what difficulties exist.
  cpuDifficulty?: C
  cpuDifficultyOptions?: LabeledDropdownOption<C>[]
  onCpuDifficultyChange?: (value: C) => void
  // The icon on a non-human seat's button chip, and on the fallback color swatch for a human vs. a
  // non-human seat (overridden there by a selected profile's own `tag`). A human seat's button chip
  // shows the selected profile's tag, or ProfilePicker's guest icon. A caller with its own extra CPU
  // states (e.g. a "no CPU" slot) computes its own icon string and passes it through cpuIcon rather
  // than this component needing any opinion on what those states are.
  humanIcon?: string
  cpuIcon?: string
  // How the seat's color is drawn, for a host that draws profile colors muted (Solitaire on its felt):
  // the seat button's chip, its Color row and swatches (the color section's `previewValue`), the
  // fallback swatch, the plain label and the Ready button all show previewValue(color), while `color`,
  // `takenColor` and what onColorChange receives stay the saved values. Unset draws them as given.
  previewValue?: (hex: string) => string
  // Extra style for the seat button's trigger, e.g. a background behind its pill so it reads on a
  // busy backdrop (ProfilePicker's and OptionPicker's `triggerStyle`).
  triggerStyle?: StyleProp<ViewStyle>
  // The Ready button's pill look over a busy backdrop (ReadyButton's `surfaceColor`): pass the
  // theme's surface, as `triggerStyle` puts one behind the seat button. Unset keeps the outline.
  readySurfaceColor?: string
  // A placement of the host's own for the seat button's dropdown, in place of useZoneClampedAlign:
  // called as a hook with whether the dropdown is open and the size it draws, and its result handed
  // to the picker as `alignOverride` (for a screen turned by a fake landscape, whose button
  // useAutoAlign would measure against the upright window). It replaces the zone clamp, so leave it
  // unset for a panel inside a @tastic/split-screen zone. A hook: keep the same one for the panel's
  // life, and remount the panel (a key) to change it.
  useSeatPickerAlign?: (open: boolean, contentWidth: number, contentHeight: number) => AlignResult
}

// One panel per player slot in a local-multiplayer loadout/lobby screen: one seat button, an
// optional second, per-app picker under it (see `secondPicker`'s own doc), and a Ready toggle for
// human seats. A human seat's button is @tastic/profile's ProfilePicker and a CPU seat's is its
// OptionPicker (the difficulty levels), each with the seat's color behind a Color row at the top of
// the same dropdown: Solitaire's player button, made the fleet's seat control (Jay, 2026-10-16). It
// used to be a profile (or difficulty) dropdown with a separate color swatch beside it, which read
// as two unrelated things. A seat with neither picker wired keeps the plain label and the separate
// swatch. Ported from five apps' own near-identical PlayerSetupPanel.tsx/LobbyPlayerPanel.tsx
// (AirHockey, BoxHockey, Pong, LightCycles, Snake), which had all independently converged on this
// exact skeleton.
//
// Owns its own popover host shared by its own pickers unless a `host` is passed in to share with
// another panel (or a shared-controls row) instead - same convention as every popover-hosting
// component in this package.
export function PlayerSetupPanel<C extends string = string>({ idPrefix, host, label, labelFontFamily, color, onColorChange, swatches, takenColor, allowSwapTaken, colorCaption, showColor = true, colorAlignOverride, colorRotation, isHuman, secondPicker, secondPickerId, ready, onToggleReady, dark, showReadyButton = true, profiles, selectedProfileId, takenProfileId, guestLabel, nullLabel, onProfileSelect, onManageProfiles, cpuDifficulty, cpuDifficultyOptions, onCpuDifficultyChange, humanIcon = 'face-man', cpuIcon = 'robot', previewValue, triggerStyle, readySurfaceColor, useSeatPickerAlign }: PlayerSetupPanelProps<C>) {
  const ownHost = usePopoverHost()
  const popover = host ?? ownHost
  // Checking *this panel's own* ids, not just "is anything open on the host" - when `host` is
  // shared, another panel's (or a shared-controls row's) popovers also live on it, and elevating
  // this panel for those too would tie it with whichever of them actually has the open popover,
  // letting DOM order (wrongly) decide which one paints on top.
  const ownPopoverOpen = popover.openId?.startsWith(`${idPrefix}-`) ?? false
  // Narrower than ownPopoverOpen on purpose - only true for a popover actually inside pickerRow
  // itself (the fallback color swatch, or secondPicker's own popover when it has one and
  // secondPickerId names it). See pickerRowOpen's own style comment for why pickerRow needs this in
  // addition to panelOpen above.
  const pickerRowPopoverOpen = popover.openId === getColorPopoverId(idPrefix) || (secondPickerId !== undefined && popover.openId === secondPickerId)
  const showProfilePicker = isHuman && profiles !== undefined && !!onProfileSelect
  const showCpuDifficulty = !isHuman && cpuDifficulty !== undefined && cpuDifficultyOptions !== undefined && !!onCpuDifficultyChange
  const seatButton = showProfilePicker || showCpuDifficulty
  // Read live from the selected profile rather than snapshotted at selection time, since a caller
  // typically has no other editing surface for it on this same screen.
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId) ?? null
  // The seat's color as it's drawn (see previewValue); `color` itself stays the saved one.
  const drawn = previewValue ? previewValue(color) : color

  const colorSection: ProfilePickerColorSection | undefined = showColor ? { value: color, onChange: onColorChange, swatches, takenValue: takenColor, allowSwapTaken, caption: showProfilePicker && selectedProfile ? colorCaption : undefined, previewValue } : undefined
  // The seat button's dropdown is placed here rather than by the caller: inside a
  // @tastic/split-screen zone (2 Player) it has to stay in that player's half, which
  // useZoneClampedAlign does, and outside one it's useAutoAlign's own placement (or the host's own,
  // useSeatPickerAlign). Sized from the same section and rows the picker draws. Rotation 0, the same
  // as the profile, color and difficulty dropdowns this button replaced were all placed with.
  const seatPickerId = showProfilePicker ? getProfilePopoverId(idPrefix) : getCpuDifficultyPopoverId(idPrefix)
  const seatPickerSize = showProfilePicker ? getProfilePickerContentSize(profiles!.length, !!onManageProfiles, colorSection) : getOptionPickerContentSize(cpuDifficultyOptions?.length ?? 0, colorSection)
  const useSeatAlign = useSeatPickerAlign ?? useZoneClampedAlign
  const seatPickerAlign = useSeatAlign(seatButton && popover.openId === seatPickerId, seatPickerSize.width, seatPickerSize.height)

  return (
    <View style={[styles.panel, ownPopoverOpen && styles.panelOpen]}>
      {showProfilePicker ? (
        <ProfilePicker idPrefix={idPrefix} host={popover} profiles={profiles!} selectedId={selectedProfileId ?? null} takenId={takenProfileId} color={drawn} dark={dark} guestLabel={guestLabel ?? 'GUEST'} nullLabel={nullLabel} onSelect={(profile: Profile | null) => onProfileSelect?.(profile)} onManage={onManageProfiles} colorSection={colorSection} alignOverride={seatPickerAlign} triggerStyle={triggerStyle} />
      ) : showCpuDifficulty ? (
        <OptionPicker id={getCpuDifficultyPopoverId(idPrefix)} host={popover} options={cpuDifficultyOptions!} value={cpuDifficulty!} onChange={onCpuDifficultyChange!} color={drawn} dark={dark} icon={cpuIcon} colorSection={colorSection} alignOverride={seatPickerAlign} triggerStyle={triggerStyle} />
      ) : (
        label && (
          <Text variant='labelSmall' style={{ color: drawn, fontFamily: labelFontFamily }}>
            {label}
          </Text>
        )
      )}

      {(!seatButton || secondPicker) && (
        <View style={[styles.pickerRow, pickerRowPopoverOpen && styles.pickerRowOpen]}>
          {/* The fallback swatch, for a seat with no button: a human slot shows the selected
          profile's own tag when it has one, falling back to humanIcon; a non-human slot always
          falls back to cpuIcon. */}
          {!seatButton && <InlineColorPicker id={getColorPopoverId(idPrefix)} host={popover} value={color} onChange={onColorChange} swatches={swatches} takenValue={takenColor} allowSwapTaken={allowSwapTaken} previewValue={previewValue} alignOverride={colorAlignOverride} rotation={colorRotation} dark={dark} tag={isHuman ? selectedProfile?.tag : undefined} icon={isHuman ? humanIcon : cpuIcon} />}

          {secondPicker}
        </View>
      )}

      {isHuman && showReadyButton && onToggleReady && <ReadyButton color={drawn} ready={ready ?? false} onToggleReady={onToggleReady} surfaceColor={readySurfaceColor} dark={dark} />}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: 12
  },
  // See SectionedDropdown's anchorOpen comment - this panel is typically a sibling of another
  // panel (and/or a shared-controls row), so a popover escaping this panel's bounds needs the panel
  // itself elevated, not just the popover content, to paint above a later sibling.
  panelOpen: {
    zIndex: 100
  },
  // Same gap as `panel`'s own vertical rhythm, reused horizontally - the fallback color swatch and
  // (when present) secondPicker sit side by side within this row instead of stacked in the panel's
  // own column.
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  // A popover is an absolutely-positioned sibling of its own trigger - so a tall one (the color
  // swatch grid) can extend down far enough to overlap the ReadyButton below, which paints on top of
  // it by default DOM order since it's a later sibling within `panel`. `panel`'s own panelOpen
  // elevation only helps this panel paint above OTHER panels (see its own comment) - it does nothing
  // for stacking *within* this panel, since React Native Web gives each View its own stacking
  // context. This is what actually fixes that: elevate pickerRow itself above its own later sibling
  // whenever one of its own popovers is open.
  pickerRowOpen: {
    zIndex: 100
  }
})
