import { SeedColor } from '@rific/auto-paper'
import { Profile, ProfilePicker } from '@tastic/profile'
import { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'

import { InlineColorPicker } from './InlineColorPicker'
import { LabeledDropdown, LabeledDropdownOption } from './LabeledDropdown'
import { ReadyButton } from './ReadyButton'
import { AlignResult, PopoverRotation } from './useAutoAlign'
import { PopoverHost, usePopoverHost } from './usePopoverHost'

// This panel's own internal color/CPU-difficulty popover ids, derived from idPrefix — exported so a
// caller that needs to know whether one of them is currently open (e.g. to compute the `open`
// argument useZoneClampedAlign's own first parameter needs, ahead of handing its result to
// colorAlignOverride/cpuDifficultyAlignOverride below) doesn't have to hardcode or guess this
// panel's own internal naming convention. Matches secondPickerId's own job for a caller's own
// externally-constructed picker — this is the equivalent for the two pickers this panel owns
// itself, which have no prop of their own to name their id with.
export function getColorPopoverId(idPrefix: string): string {
  return `${idPrefix}-color`
}
export function getCpuDifficultyPopoverId(idPrefix: string): string {
  return `${idPrefix}-difficulty`
}

export interface PlayerSetupPanelProps<C extends string = string> {
  // Namespaces this panel's popover ids ('color', whatever secondPickerId names, 'difficulty') so
  // two panels can safely share one host (see `host` below) without their ids colliding.
  idPrefix: string
  // Shared popover host, when this panel's own popovers should be mutually exclusive with another
  // panel's or a shared-controls row's (e.g. vs-CPU: only one human is ever driving both slots, so
  // having both YOU's and CPU's pickers open at once is just clutter, not a useful simultaneous-edit
  // case). Omit to fall back to this panel's own independent host — the two-player case, where two
  // real people editing at once is the point.
  host?: PopoverHost
  label?: string
  // Applied only to the plain `label` fallback text below (ProfilePicker/LabeledDropdown render
  // their own fixed chrome regardless of this prop) — omit to inherit whichever font the calling
  // screen's own theme resolves for a labelSmall Text, rather than this package forcing its own
  // MONO_FONT onto what's really the host app's own copy.
  labelFontFamily?: string
  color: string
  onColorChange: (hex: string) => void
  swatches: SeedColor[]
  // The other player's current color — stays visible in the swatch grid but disabled, rather than
  // removed from it entirely. Unless allowSwapTaken is set — see InlineColorPicker's own doc.
  takenColor?: string
  allowSwapTaken?: boolean
  // Passed straight through to the internal InlineColorPicker's own `alignOverride` — this panel
  // has no way for a caller to reach that picker directly (it's not a ReactNode slot the way
  // secondPicker is, see that prop's own doc), so a caller inside a @tastic/split-screen zone
  // needs this to substitute useZoneClampedAlign's result for the color picker's own popover.
  colorAlignOverride?: AlignResult
  // Passed straight through to the internal InlineColorPicker's own `rotation` — same reasoning as
  // colorAlignOverride above (no other way for a caller to reach that picker directly), for a
  // caller whose own rotation reading needs to differ from InlineColorPicker's default ambient
  // useRotation() read (see that component's own `rotation` doc for when that's worth doing).
  colorRotation?: PopoverRotation
  isHuman: boolean
  // Whatever sits beside the color picker in pickerRow, if anything — a ControlSchemePicker, a raw
  // SectionedDropdown, or nothing at all. The five apps this component was extracted from each
  // duplicated this entire panel and differed only in what (if anything) occupied this one slot,
  // each wanting a genuinely different concept there (which physical input drives a seat, vs. a
  // pull/push "feel" preference, vs. no such concept at all for a game with no per-seat setting to
  // pick) — a ReactNode slot the caller renders its own picker into is what actually generalizes
  // across all of them, rather than this component baking in one shape (e.g. ControlSchemePicker's
  // own prop set) that most of its consumers don't need at all.
  secondPicker?: ReactNode
  // The popover id secondPicker opens under, if it opens one at all — lets pickerRow's own
  // "elevate above later siblings while one of my own popovers is open" logic (see pickerRowOpen)
  // react to secondPicker's popover the same way it already does for the color picker's, without
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
  // What the name trigger shows before any profile's selected — this seat's own 'P1'/'P2' (see
  // ProfilePicker's own doc for why it's never "Player"). Required whenever profiles is provided,
  // since the trigger always needs some idle text.
  guestLabel?: string
  onProfileSelect?: (profile: Profile | null) => void
  // Navigates to a profile-management screen — typically only ever wired up for one seat (a rotated
  // second zone often can't host a working text keyboard).
  onManageProfiles?: () => void
  // Generic over the calling app's own CPU-difficulty union, matching LabeledDropdownOption<T>'s own
  // genericness — this package has no opinion on what difficulties exist.
  cpuDifficulty?: C
  cpuDifficultyOptions?: LabeledDropdownOption<C>[]
  onCpuDifficultyChange?: (value: C) => void
  // Passed straight through to the internal LabeledDropdown's own `alignOverride` — same reasoning
  // as colorAlignOverride above, for the CPU-difficulty picker instead of the color picker.
  cpuDifficultyAlignOverride?: AlignResult
  // InlineColorPicker's own `icon` for a human vs. a non-human seat (overridden by a selected
  // profile's own `tag`, same precedence InlineColorPicker itself applies) — defaults match every
  // consumer's own convention. A caller with its own extra CPU states (e.g. a "no CPU" slot) computes
  // its own icon string and passes it through cpuIcon rather than this component needing any opinion
  // on what those states are.
  humanIcon?: string
  cpuIcon?: string
}

// One panel per player slot in a local-multiplayer loadout/lobby screen: a name header (a saved
// profile switcher for a human seat, a CPU-difficulty picker for a non-human one, or a plain label
// when neither applies), a color picker optionally paired with a second, per-app picker (see
// `secondPicker`'s own doc), and a Ready toggle for human seats. Ported from five apps' own
// near-identical PlayerSetupPanel.tsx/LobbyPlayerPanel.tsx (AirHockey, BoxHockey, Pong, LightCycles,
// Snake), which had all independently converged on this exact skeleton.
//
// Owns its own popover host shared by its own color/profile/difficulty pickers unless a `host` is
// passed in to share with another panel (or a shared-controls row) instead — same convention as
// every popover-hosting component in this package.
export function PlayerSetupPanel<C extends string = string>({ idPrefix, host, label, labelFontFamily, color, onColorChange, swatches, takenColor, allowSwapTaken, colorAlignOverride, colorRotation, isHuman, secondPicker, secondPickerId, ready, onToggleReady, dark, showReadyButton = true, profiles, selectedProfileId, takenProfileId, guestLabel, onProfileSelect, onManageProfiles, cpuDifficulty, cpuDifficultyOptions, onCpuDifficultyChange, cpuDifficultyAlignOverride, humanIcon = 'face-man', cpuIcon = 'robot' }: PlayerSetupPanelProps<C>) {
  const ownHost = usePopoverHost()
  const popover = host ?? ownHost
  // Checking *this panel's own* ids, not just "is anything open on the host" — when `host` is
  // shared, another panel's (or a shared-controls row's) popovers also live on it, and elevating
  // this panel for those too would tie it with whichever of them actually has the open popover,
  // letting DOM order (wrongly) decide which one paints on top.
  const ownPopoverOpen = popover.openId?.startsWith(`${idPrefix}-`) ?? false
  // Narrower than ownPopoverOpen on purpose — only true for a popover actually inside pickerRow
  // itself (color, or secondPicker's own popover when it has one and secondPickerId names it). See
  // pickerRowOpen's own style comment for why pickerRow needs this in addition to panelOpen above.
  const pickerRowPopoverOpen = popover.openId === getColorPopoverId(idPrefix) || (secondPickerId !== undefined && popover.openId === secondPickerId)
  const showProfilePicker = isHuman && profiles !== undefined && !!onProfileSelect
  const showCpuDifficulty = !isHuman && cpuDifficulty !== undefined && cpuDifficultyOptions !== undefined && !!onCpuDifficultyChange
  // The color button's own tag display (see InlineColorPicker) — read live from the selected
  // profile rather than snapshotted at selection time, since a caller typically has no other
  // editing surface for it on this same screen.
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId) ?? null

  return (
    <View style={[styles.panel, ownPopoverOpen && styles.panelOpen]}>
      {showProfilePicker ? (
        <ProfilePicker idPrefix={idPrefix} host={popover} profiles={profiles!} selectedId={selectedProfileId ?? null} takenId={takenProfileId} color={color} dark={dark} guestLabel={guestLabel ?? 'GUEST'} onSelect={(profile: Profile | null) => onProfileSelect?.(profile)} onManage={onManageProfiles} />
      ) : showCpuDifficulty ? (
        <LabeledDropdown id={getCpuDifficultyPopoverId(idPrefix)} host={popover} options={cpuDifficultyOptions!} value={cpuDifficulty!} onChange={onCpuDifficultyChange!} color={color} dark={dark} alignOverride={cpuDifficultyAlignOverride} />
      ) : (
        label && (
          <Text variant='labelSmall' style={{ color, fontFamily: labelFontFamily }}>
            {label}
          </Text>
        )
      )}

      <View style={[styles.pickerRow, pickerRowPopoverOpen && styles.pickerRowOpen]}>
        {/* Human slots show the selected profile's own tag when it has one, falling back to
        humanIcon; a non-human slot always falls back to cpuIcon — this is what actually
        distinguishes "you" from "the CPU" now, not a fixed icon. */}
        <InlineColorPicker id={getColorPopoverId(idPrefix)} host={popover} value={color} onChange={onColorChange} swatches={swatches} takenValue={takenColor} allowSwapTaken={allowSwapTaken} alignOverride={colorAlignOverride} rotation={colorRotation} dark={dark} tag={isHuman ? selectedProfile?.tag : undefined} icon={isHuman ? humanIcon : cpuIcon} />

        {secondPicker}
      </View>

      {isHuman && showReadyButton && onToggleReady && <ReadyButton color={color} ready={ready ?? false} onToggleReady={onToggleReady} />}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: 12
  },
  // See SectionedDropdown's anchorOpen comment — this panel is typically a sibling of another
  // panel (and/or a shared-controls row), so a popover escaping this panel's bounds needs the panel
  // itself elevated, not just the popover content, to paint above a later sibling.
  panelOpen: {
    zIndex: 100
  },
  // Same gap as `panel`'s own vertical rhythm, reused horizontally — the color picker and (when
  // present) secondPicker sit side by side within this row instead of stacked in the panel's own
  // column.
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  // A popover is an absolutely-positioned sibling of its own trigger — so a tall one (the color
  // swatch grid) can extend down far enough to overlap the ReadyButton below, which paints on top of
  // it by default DOM order since it's a later sibling within `panel`. `panel`'s own panelOpen
  // elevation only helps this panel paint above OTHER panels (see its own comment) — it does nothing
  // for stacking *within* this panel, since React Native Web gives each View its own stacking
  // context. This is what actually fixes that: elevate pickerRow itself above its own later sibling
  // whenever one of its own popovers is open.
  pickerRowOpen: {
    zIndex: 100
  }
})
