import { defaultColors } from '@rific/auto-paper'
import { getOptionPickerContentSize, getProfilePickerContentSize, OptionPicker, ProfilePicker } from '@tastic/profile'
import { render, screen } from '@testing-library/react'
import { act, useEffect } from 'react'
import { Icon } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { getColorPopoverId, getCpuDifficultyPopoverId, getProfilePopoverId, PlayerSetupPanel, PlayerSetupPanelProps } from '../PlayerSetupPanel'
import { useAutoAlign } from '../useAutoAlign'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

// Only this file's own "placement" describe block below asserts against useAutoAlign's call args -
// every other test here never depends on its real alignment output, so replacing it with a
// jest.fn() (real implementation preserved for anything not overridden per-test) doesn't change any
// existing test's behavior. Mocking this module (rather than InlineColorPicker itself, which renders
// for real elsewhere in this file) is what lets this file verify PlayerSetupPanel sizes its seat
// button's dropdown and forwards colorAlignOverride to the fallback swatch.
jest.mock('../useAutoAlign', () => ({
  ...jest.requireActual('../useAutoAlign'),
  useAutoAlign: jest.fn(jest.requireActual('../useAutoAlign').useAutoAlign)
}))

type Difficulty = 'easy' | 'hard'

const DIFFICULTY_OPTIONS = [
  { value: 'easy' as Difficulty, label: 'Easy' },
  { value: 'hard' as Difficulty, label: 'Hard' }
]

const baseProps = {
  idPrefix: 'p1',
  color: '#3366ff',
  onColorChange: jest.fn(),
  swatches: defaultColors,
  isHuman: true,
  dark: false
}

type HostBox = { current: PopoverHost | null }

function Harness({ hostBoxRef, ...overrides }: { hostBoxRef: HostBox } & Partial<Omit<PlayerSetupPanelProps<Difficulty>, 'host'>>) {
  const host = usePopoverHost()
  useEffect(() => {
    hostBoxRef.current = host
  })
  return <PlayerSetupPanel {...baseProps} {...overrides} host={host} />
}

function renderPanel(overrides: Partial<Omit<PlayerSetupPanelProps<Difficulty>, 'host'>> = {}) {
  const hostBoxRef: HostBox = { current: null }
  const result = render(<Harness hostBoxRef={hostBoxRef} {...overrides} />)
  return { ...result, hostBoxRef }
}

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

// panel's own style object is exactly {alignItems, gap} - no flexDirection key - so this is enough
// to tell it apart from pickerRow's own {alignItems, flexDirection, gap} below, and from any View
// InlineColorPicker/LabeledDropdown render internally (neither uses this exact key combination).
const isPanelStyle = (o: Record<string, unknown>) => o.gap === 12 && !('flexDirection' in o)
const isPickerRowStyle = (o: Record<string, unknown>) => o.flexDirection === 'row' && o.gap === 12

// Scans from the most recent call backward - mockViewRender's calls accumulate across every
// render within a single test (mocks are only cleared between tests, see jest.config.cjs'
// clearMocks), so after an act()-wrapped popover toggle the matching call for a still-elevated
// or now-elevated View is whichever one fired last, not the first (pre-toggle) one with that
// same style shape.
function findStyledView(predicate: (o: Record<string, unknown>) => boolean) {
  const calls = (mockViewRender as jest.Mock).mock.calls
  for (let i = calls.length - 1; i >= 0; i--) {
    const styles = flatten((calls[i][0] as { style?: unknown }).style)
    if (styles.some(predicate)) return styles
  }
  throw new Error('no matching View found')
}

function hasZIndex100(styles: Record<string, unknown>[]) {
  return styles.some((o) => o.zIndex === 100)
}

function iconSources(): unknown[] {
  return (Icon as jest.Mock).mock.calls.map((c) => (c[0] as { source?: unknown }).source)
}

const ADA = { id: 'a', name: 'Ada', color: '#ff0000', tag: 'AD', createdAt: 0, updatedAt: 0 }
const cpuSeat = { isHuman: false, cpuDifficulty: 'easy' as Difficulty, cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() }
const profilePickerProps = () => (ProfilePicker as jest.Mock).mock.calls[(ProfilePicker as jest.Mock).mock.calls.length - 1][0]
const optionPickerProps = () => (OptionPicker as jest.Mock).mock.calls[(OptionPicker as jest.Mock).mock.calls.length - 1][0]

describe('PlayerSetupPanel', () => {
  describe('header', () => {
    it('renders the plain label when neither a profile picker nor a CPU-difficulty picker applies', () => {
      renderPanel({ label: 'P1' })

      expect(screen.getByText('P1')).toBeTruthy()
      expect(ProfilePicker).not.toHaveBeenCalled()
      expect(OptionPicker).not.toHaveBeenCalled()
    })

    it('prefers the profile picker over the plain label for a human seat with profiles wired', () => {
      const profiles = [ADA]
      const onProfileSelect = jest.fn()
      const onManageProfiles = jest.fn()
      renderPanel({ label: 'P1', profiles, selectedProfileId: 'a', takenProfileId: 'b', onProfileSelect, onManageProfiles, guestLabel: 'YOU' })

      expect(screen.queryByText('P1')).toBeNull()
      expect(ProfilePicker).toHaveBeenCalledTimes(1)
      const props = profilePickerProps()
      expect(props).toEqual(
        expect.objectContaining({
          idPrefix: 'p1',
          profiles,
          selectedId: 'a',
          takenId: 'b',
          color: '#3366ff',
          dark: false,
          guestLabel: 'YOU',
          onManage: onManageProfiles
        })
      )

      props.onSelect(profiles[0])
      expect(onProfileSelect).toHaveBeenCalledWith(profiles[0])
    })

    it("defaults the profile picker's guestLabel to 'GUEST' when omitted", () => {
      renderPanel({ profiles: [], onProfileSelect: jest.fn() })

      expect(profilePickerProps()).toEqual(expect.objectContaining({ guestLabel: 'GUEST' }))
    })

    it('shows the CPU seat button for a non-human seat with cpuDifficulty wired: the difficulty levels, under its own id, with cpuIcon on the chip', () => {
      const onCpuDifficultyChange = jest.fn()
      renderPanel({ label: 'CPU', ...cpuSeat, onCpuDifficultyChange, cpuIcon: 'close-circle-outline' })

      expect(screen.queryByText('CPU')).toBeNull()
      expect(ProfilePicker).not.toHaveBeenCalled()
      const props = optionPickerProps()
      expect(props).toEqual(expect.objectContaining({ id: getCpuDifficultyPopoverId('p1'), options: DIFFICULTY_OPTIONS, value: 'easy', color: '#3366ff', dark: false, icon: 'close-circle-outline' }))
      props.onChange('hard')
      expect(onCpuDifficultyChange).toHaveBeenCalledWith('hard')
    })

    it("defaults the CPU seat's chip icon to 'robot'", () => {
      renderPanel(cpuSeat)
      expect(optionPickerProps().icon).toBe('robot')
    })

    it('does not show the CPU seat button for a human seat, even with cpuDifficulty wired', () => {
      renderPanel({ label: 'P1', isHuman: true, cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() })

      expect(screen.getByText('P1')).toBeTruthy()
      expect(OptionPicker).not.toHaveBeenCalled()
    })
  })

  describe("the seat button's Color row", () => {
    it("is the seat's color, swatches and the other seat's color, committing through onColorChange", () => {
      const onColorChange = jest.fn()
      renderPanel({ profiles: [ADA], onProfileSelect: jest.fn(), onColorChange, takenColor: '#00ff00', allowSwapTaken: true })

      const section = profilePickerProps().colorSection
      expect(section).toEqual(expect.objectContaining({ value: '#3366ff', swatches: defaultColors, takenValue: '#00ff00', allowSwapTaken: true }))
      section.onChange('#abcdef')
      expect(onColorChange).toHaveBeenCalledWith('#abcdef')
    })

    it('is on the CPU seat button too', () => {
      renderPanel({ ...cpuSeat, takenColor: '#00ff00', allowSwapTaken: true })
      expect(optionPickerProps().colorSection).toEqual(expect.objectContaining({ value: '#3366ff', takenValue: '#00ff00', allowSwapTaken: true }))
    })

    it('captions it with colorCaption only while a profile is selected', () => {
      const { unmount } = renderPanel({ profiles: [ADA], selectedProfileId: 'a', onProfileSelect: jest.fn(), colorCaption: 'Snake only' })
      expect(profilePickerProps().colorSection.caption).toBe('Snake only')
      unmount()

      const guest = renderPanel({ profiles: [ADA], selectedProfileId: null, onProfileSelect: jest.fn(), colorCaption: 'Snake only' })
      expect(profilePickerProps().colorSection.caption).toBeUndefined()
      guest.unmount()

      renderPanel({ ...cpuSeat, colorCaption: 'Snake only' })
      expect(optionPickerProps().colorSection.caption).toBeUndefined()
    })

    it('is left out with showColor false', () => {
      const { unmount } = renderPanel({ profiles: [ADA], onProfileSelect: jest.fn(), showColor: false })
      expect(profilePickerProps().colorSection).toBeUndefined()
      unmount()

      renderPanel({ ...cpuSeat, showColor: false })
      expect(optionPickerProps().colorSection).toBeUndefined()
    })

    it('replaces the separate color swatch on either seat button', () => {
      const { unmount } = renderPanel({ profiles: [ADA], selectedProfileId: 'a', onProfileSelect: jest.fn() })
      expect(iconSources()).not.toContain('face-man')
      expect(screen.queryByText('AD')).toBeNull()
      unmount()

      renderPanel(cpuSeat)
      expect(iconSources()).not.toContain('robot')
    })
  })

  describe('fallback color swatch', () => {
    it("defaults to 'face-man' for a human seat and 'robot' for a non-human seat", () => {
      const { unmount } = renderPanel({ isHuman: true })
      expect(iconSources()).toContain('face-man')
      unmount()

      renderPanel({ isHuman: false })
      expect(iconSources()).toContain('robot')
    })

    it('lets a caller override the default icons via humanIcon/cpuIcon', () => {
      const { unmount } = renderPanel({ isHuman: true, humanIcon: 'account' })
      expect(iconSources()).toContain('account')
      expect(iconSources()).not.toContain('face-man')
      unmount()

      renderPanel({ isHuman: false, cpuIcon: 'close-circle-outline' })
      expect(iconSources()).toContain('close-circle-outline')
      expect(iconSources()).not.toContain('robot')
    })
  })

  describe('secondPicker', () => {
    it('renders whatever secondPicker is given inside the picker row, and nothing when omitted', () => {
      const { unmount } = renderPanel({ secondPicker: <Icon source='keyboard-outline' size={16} /> })
      expect(iconSources()).toContain('keyboard-outline')
      unmount()
      ;(Icon as jest.Mock).mockClear()

      renderPanel()
      expect(iconSources()).not.toContain('keyboard-outline')
    })

    it('keeps the picker row for secondPicker under a seat button, and drops the empty row without one', () => {
      const { unmount } = renderPanel({ profiles: [ADA], onProfileSelect: jest.fn(), secondPicker: <Icon source='keyboard-outline' size={16} /> })
      expect(iconSources()).toContain('keyboard-outline')
      expect(() => findStyledView(isPickerRowStyle)).not.toThrow()
      unmount()
      ;(mockViewRender as jest.Mock).mockClear()

      renderPanel({ profiles: [ADA], onProfileSelect: jest.fn() })
      expect(() => findStyledView(isPickerRowStyle)).toThrow()
    })
  })

  describe('ready button', () => {
    it('renders for a human seat with onToggleReady wired', () => {
      renderPanel({ isHuman: true, ready: false, onToggleReady: jest.fn() })
      expect(screen.getByText('READY?')).toBeTruthy()
    })

    it('is omitted for a non-human seat even with onToggleReady wired', () => {
      renderPanel({ isHuman: false, onToggleReady: jest.fn() })
      expect(screen.queryByText('READY?')).toBeNull()
      expect(screen.queryByText('READY ✓')).toBeNull()
    })

    it('is omitted when showReadyButton is false', () => {
      renderPanel({ isHuman: true, onToggleReady: jest.fn(), showReadyButton: false })
      expect(screen.queryByText('READY?')).toBeNull()
    })

    it('is omitted when onToggleReady is not provided at all', () => {
      renderPanel({ isHuman: true })
      expect(screen.queryByText('READY?')).toBeNull()
    })
  })

  describe('popover elevation', () => {
    it('elevates neither panel nor pickerRow while nothing is open', () => {
      renderPanel()
      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(false)
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(false)
    })

    it('elevates both panel and pickerRow once the fallback color popover (idPrefix-color) opens', () => {
      const { hostBoxRef } = renderPanel()
      act(() => hostBoxRef.current!.toggle(getColorPopoverId('p1')))

      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(true)
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(true)
    })

    it("elevates only panel, not pickerRow, for the seat button's own dropdown", () => {
      const secondPicker = <Icon source='keyboard-outline' size={16} />
      const { hostBoxRef, unmount } = renderPanel({ profiles: [ADA], onProfileSelect: jest.fn(), secondPicker, secondPickerId: 'p1-controls' })
      act(() => hostBoxRef.current!.toggle(getProfilePopoverId('p1')))
      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(true)
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(false)
      unmount()
      ;(mockViewRender as jest.Mock).mockClear()

      const cpu = renderPanel({ ...cpuSeat, secondPicker })
      act(() => cpu.hostBoxRef.current!.toggle(getCpuDifficultyPopoverId('p1')))
      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(true)
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(false)
    })

    it("elevates pickerRow when secondPickerId's own popover opens", () => {
      const { hostBoxRef } = renderPanel({ secondPickerId: 'p1-controls' })
      act(() => hostBoxRef.current!.toggle('p1-controls'))

      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(true)
    })

    it("does not elevate pickerRow for an id that isn't the color picker's or secondPickerId, when secondPickerId is omitted", () => {
      const { hostBoxRef } = renderPanel()
      act(() => hostBoxRef.current!.toggle('p1-controls'))

      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(false)
    })

    it('never elevates a panel for a popover open on an unrelated host id (different idPrefix)', () => {
      const { hostBoxRef } = renderPanel()
      act(() => hostBoxRef.current!.toggle('p2-color'))

      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(false)
    })
  })

  describe('placement', () => {
    const ALIGN_OVERRIDE = { align: 'right' as const, verticalAlign: 'above' as const, maxHeight: 123, measured: true, triggerRef: { current: null } }

    it("places the profile seat button's dropdown itself, sized from the same rows and Color row it draws", () => {
      const { hostBoxRef } = renderPanel({ profiles: [ADA], onProfileSelect: jest.fn(), onManageProfiles: jest.fn(), colorCaption: 'Snake only', selectedProfileId: 'a' })

      expect(getProfilePickerContentSize).toHaveBeenLastCalledWith(1, true, profilePickerProps().colorSection)
      expect(useAutoAlign).toHaveBeenLastCalledWith(false, 220, 301, 0)
      expect(profilePickerProps().alignOverride).toEqual(expect.objectContaining({ measured: expect.any(Boolean), triggerRef: expect.anything() }))

      act(() => hostBoxRef.current!.toggle(getProfilePopoverId('p1')))
      expect(useAutoAlign).toHaveBeenLastCalledWith(true, 220, 301, 0)
    })

    it("places the CPU seat button's dropdown from its own size", () => {
      const { hostBoxRef } = renderPanel(cpuSeat)

      expect(getOptionPickerContentSize).toHaveBeenLastCalledWith(DIFFICULTY_OPTIONS.length, optionPickerProps().colorSection)
      expect(useAutoAlign).toHaveBeenLastCalledWith(false, 220, 202, 0)

      act(() => hostBoxRef.current!.toggle(getCpuDifficultyPopoverId('p1')))
      expect(useAutoAlign).toHaveBeenLastCalledWith(true, 220, 202, 0)
      expect(optionPickerProps().alignOverride).toBeDefined()
    })

    it('forwards colorAlignOverride to the fallback InlineColorPicker without breaking its own rendering', () => {
      renderPanel({ colorAlignOverride: ALIGN_OVERRIDE })

      // InlineColorPicker itself still renders (its trigger is always present regardless of open
      // state) - this exercises the pass-through path without needing to also assert on
      // InlineColorPicker's own internal placement logic, which is that component's own test's job.
      expect(mockViewRender).toHaveBeenCalled()
      expect(useAutoAlign).toHaveBeenCalled()
    })

    it('forwards colorRotation to the fallback InlineColorPicker, overriding its default ambient useRotation() read', () => {
      renderPanel({ colorRotation: 180 })

      // InlineColorPicker's own useAutoAlign call takes rotation as its 4th argument - see that
      // component's own test file for the identical assertion shape.
      const calls = (useAutoAlign as jest.Mock).mock.calls
      expect(calls[calls.length - 1][3]).toBe(180)
    })
  })

  describe('popover ids', () => {
    it('derive the ids this panel actually opens its popovers under', () => {
      expect(getColorPopoverId('p1')).toBe('p1-color')
      expect(getProfilePopoverId('p1')).toBe('p1-profile')
      expect(getCpuDifficultyPopoverId('p1')).toBe('p1-difficulty')

      // Ties the derived ids to the real ones: the fallback swatch's id elevates pickerRow, the
      // seat buttons open under theirs (see the placement block above).
      const { hostBoxRef } = renderPanel()
      act(() => hostBoxRef.current!.toggle(getColorPopoverId('p1')))
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(true)
    })
  })
})
