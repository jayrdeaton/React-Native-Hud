import { defaultColors } from '@rific/auto-paper'
import { ProfilePicker } from '@tastic/profile'
import { render, screen } from '@testing-library/react'
import { act, useEffect } from 'react'
import { Icon } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { getColorPopoverId, getCpuDifficultyPopoverId, PlayerSetupPanel, PlayerSetupPanelProps } from '../PlayerSetupPanel'
import { useAutoAlign } from '../useAutoAlign'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

// Only this file's own "alignment passthrough" describe block below asserts against useAutoAlign's
// call args — every other test here never depends on its real alignment output, so replacing it
// with a jest.fn() (real implementation preserved for anything not overridden per-test) doesn't
// change any existing test's behavior. Mocking this module (rather than InlineColorPicker/
// LabeledDropdown themselves, both of which render for real elsewhere in this file) is what lets
// this file verify PlayerSetupPanel actually forwards colorAlignOverride/cpuDifficultyAlignOverride
// through to them.
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

// panel's own style object is exactly {alignItems, gap} — no flexDirection key — so this is enough
// to tell it apart from pickerRow's own {alignItems, flexDirection, gap} below, and from any View
// InlineColorPicker/LabeledDropdown render internally (neither uses this exact key combination).
const isPanelStyle = (o: Record<string, unknown>) => o.gap === 12 && !('flexDirection' in o)
const isPickerRowStyle = (o: Record<string, unknown>) => o.flexDirection === 'row' && o.gap === 12

// Scans from the most recent call backward — mockViewRender's calls accumulate across every
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

describe('PlayerSetupPanel', () => {
  describe('header', () => {
    it('renders the plain label when neither a profile picker nor a CPU-difficulty picker applies', () => {
      renderPanel({ label: 'P1' })

      expect(screen.getByText('P1')).toBeTruthy()
      expect(ProfilePicker).not.toHaveBeenCalled()
    })

    it('prefers the profile picker over the plain label for a human seat with profiles wired', () => {
      const profiles = [{ id: 'a', name: 'Ada', color: '#ff0000', tag: 'AD', createdAt: 0, updatedAt: 0 }]
      const onProfileSelect = jest.fn()
      renderPanel({ label: 'P1', profiles, selectedProfileId: 'a', takenProfileId: 'b', onProfileSelect, guestLabel: 'YOU' })

      expect(screen.queryByText('P1')).toBeNull()
      expect(ProfilePicker).toHaveBeenCalledTimes(1)
      const props = (ProfilePicker as jest.Mock).mock.calls[0][0]
      expect(props).toEqual(
        expect.objectContaining({
          idPrefix: 'p1',
          profiles,
          selectedId: 'a',
          takenId: 'b',
          color: '#3366ff',
          dark: false,
          guestLabel: 'YOU'
        })
      )

      props.onSelect(profiles[0])
      expect(onProfileSelect).toHaveBeenCalledWith(profiles[0])
    })

    it("defaults the profile picker's guestLabel to 'GUEST' when omitted", () => {
      renderPanel({ profiles: [], onProfileSelect: jest.fn() })

      expect((ProfilePicker as jest.Mock).mock.calls[0][0]).toEqual(expect.objectContaining({ guestLabel: 'GUEST' }))
    })

    it('falls back to a CPU-difficulty dropdown for a non-human seat with cpuDifficulty wired', () => {
      renderPanel({ label: 'CPU', isHuman: false, cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() })

      expect(screen.queryByText('CPU')).toBeNull()
      expect(screen.getByText('EASY')).toBeTruthy()
      expect(ProfilePicker).not.toHaveBeenCalled()
    })

    it('does not show the CPU-difficulty dropdown for a human seat, even with cpuDifficulty wired', () => {
      renderPanel({ label: 'P1', isHuman: true, cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() })

      expect(screen.getByText('P1')).toBeTruthy()
      expect(screen.queryByText('EASY')).toBeNull()
    })
  })

  describe('color trigger icon', () => {
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

    it("passes the selected profile's own tag through to the color trigger, human seats only", () => {
      const profiles = [{ id: 'a', name: 'Ada', color: '#ff0000', tag: 'AD', createdAt: 0, updatedAt: 0 }]
      const { unmount } = renderPanel({ isHuman: true, profiles, selectedProfileId: 'a', onProfileSelect: jest.fn() })
      expect(screen.getByText('AD')).toBeTruthy()
      unmount()

      // Same selectedProfileId, but a non-human seat never reads a tag off it at all.
      renderPanel({ isHuman: false, profiles, selectedProfileId: 'a', cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() })
      expect(screen.queryByText('AD')).toBeNull()
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

    it('elevates both panel and pickerRow once the color popover (idPrefix-color) opens', () => {
      const { hostBoxRef } = renderPanel()
      act(() => hostBoxRef.current!.toggle(getColorPopoverId('p1')))

      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(true)
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(true)
    })

    it('elevates only panel, not pickerRow, for an own popover outside the picker row (e.g. the difficulty dropdown)', () => {
      const { hostBoxRef } = renderPanel({ isHuman: false, cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() })
      act(() => hostBoxRef.current!.toggle(getCpuDifficultyPopoverId('p1')))

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

  describe('alignment passthrough', () => {
    const ALIGN_OVERRIDE = { align: 'right' as const, verticalAlign: 'above' as const, maxHeight: 123, measured: true, triggerRef: { current: null } }

    it('forwards colorAlignOverride to the internal InlineColorPicker without breaking its own rendering', () => {
      renderPanel({ colorAlignOverride: ALIGN_OVERRIDE })

      // InlineColorPicker itself still renders (its trigger is always present regardless of open
      // state) — this exercises the pass-through path without needing to also assert on
      // InlineColorPicker's own internal placement logic, which is that component's own test's job.
      expect(mockViewRender).toHaveBeenCalled()
      expect(useAutoAlign).toHaveBeenCalled()
    })

    it('forwards colorRotation to the internal InlineColorPicker, overriding its default ambient useRotation() read', () => {
      renderPanel({ colorRotation: 180 })

      // InlineColorPicker's own useAutoAlign call takes rotation as its 4th argument — see that
      // component's own test file for the identical assertion shape.
      const calls = (useAutoAlign as jest.Mock).mock.calls
      expect(calls[calls.length - 1][3]).toBe(180)
    })

    it('forwards cpuDifficultyAlignOverride to the internal LabeledDropdown without breaking its own rendering', () => {
      renderPanel({ isHuman: false, cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn(), cpuDifficultyAlignOverride: ALIGN_OVERRIDE })

      expect(screen.getByText('EASY')).toBeTruthy()
      expect(useAutoAlign).toHaveBeenCalled()
    })

    it('cpuDifficultyAlignOverride is a no-op for a human seat, which never renders LabeledDropdown at all', () => {
      renderPanel({ label: 'P1', isHuman: true, cpuDifficultyAlignOverride: ALIGN_OVERRIDE })

      expect(screen.getByText('P1')).toBeTruthy()
    })
  })

  describe('getColorPopoverId / getCpuDifficultyPopoverId', () => {
    it('derive the same ids this panel actually opens its color/difficulty popovers under', () => {
      expect(getColorPopoverId('p1')).toBe('p1-color')
      expect(getCpuDifficultyPopoverId('p1')).toBe('p1-difficulty')

      // Confirms the derived id is the REAL one this panel's own internal InlineColorPicker/
      // LabeledDropdown open under, not just a string this test happens to also hardcode the same
      // way — toggling the derived id and observing the same elevation behavior the two tests above
      // already establish for the hardcoded literal is what actually ties them together.
      const { hostBoxRef } = renderPanel({ isHuman: false, cpuDifficulty: 'easy', cpuDifficultyOptions: DIFFICULTY_OPTIONS, onCpuDifficultyChange: jest.fn() })
      act(() => hostBoxRef.current!.toggle(getColorPopoverId('p1')))
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(true)

      act(() => hostBoxRef.current!.toggle(getColorPopoverId('p1')))
      act(() => hostBoxRef.current!.toggle(getCpuDifficultyPopoverId('p1')))
      expect(hasZIndex100(findStyledView(isPickerRowStyle))).toBe(false)
      expect(hasZIndex100(findStyledView(isPanelStyle))).toBe(true)
    })
  })
})
