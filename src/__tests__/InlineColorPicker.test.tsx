import { defaultColors, SeedColor } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { useRotation } from '@tastic/core'
import { act, render, screen } from '@testing-library/react'
import { ScrollView, useWindowDimensions } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { getInlineColorPickerContentSize, InlineColorPicker } from '../InlineColorPicker'
import { useAutoAlign } from '../useAutoAlign'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

// Only this file's own "rotation" describe block below actually asserts against useAutoAlign's call
// args — every other test here never depends on its real alignment output, so replacing it with a
// jest.fn() (real implementation preserved for anything not overridden per-test) doesn't change any
// existing test's behavior.
jest.mock('../useAutoAlign', () => ({
  ...jest.requireActual('../useAutoAlign'),
  useAutoAlign: jest.fn(jest.requireActual('../useAutoAlign').useAutoAlign)
}))

// A real usePopoverHost, wired into the SAME render tree as the component under test (rather than
// a separately-rendered renderHook() instance) — this is what lets clicking the trigger inside this
// tree actually re-render InlineColorPicker with the updated openId, instead of mutating a host
// object nothing downstream ever observes. `onHost` is called on every render with the latest host
// so a test can read the latest openId right after an interaction (via the `hostBox` its own
// callback closes over — Harness itself only ever calls the prop, never mutates one, so this stays
// clean under the no-mutating-props/hook-purity lint rules).
interface HostBox {
  host: PopoverHost | null
}

interface HarnessProps {
  onHost: (host: PopoverHost) => void
  id?: string
  value: string
  onChange: (hex: string) => void
  swatches?: SeedColor[]
  takenValue?: string
  allowSwapTaken?: boolean
  tag?: string
  autoDismiss?: boolean
  columns?: number
  rotation?: 0 | 90 | -90 | 180
  alignOverride?: Parameters<typeof InlineColorPicker>[0]['alignOverride']
}

function Harness({ onHost, id = 'picker', ...rest }: HarnessProps) {
  const host = usePopoverHost()
  onHost(host)
  return <InlineColorPicker id={id} host={host} dark={false} {...rest} />
}

function newHostBox(): HostBox {
  return { host: null }
}

// The trigger's own onPress is always TouchableRipple call index 0 on first mount — swatch
// TouchableRipples don't exist until the popover is open.
function triggerOnPress() {
  return (TouchableRipple as jest.Mock).mock.calls[0][0].onPress
}

// Each TouchableRipple's `style` prop is an array; for both the trigger and every swatch, exactly
// one element in that array is a plain `{ backgroundColor }` object (see InlineColorPicker's own
// style arrays) — every other element (styles.trigger / styles.swatch / conditional selected/taken
// styles) never carries that key. That makes backgroundColor a reliable way to find "the
// TouchableRipple currently rendering this particular color", independent of how many render
// passes useAutoAlign's measurement causes (confirmed empirically: opening causes 2 extra render
// passes beyond the initial mount, well more than a naive "1 + swatch count" would suggest).
function styleBackgroundColor(props: { style?: unknown }): string | undefined {
  const flat = [props.style].flat()
  const match = flat.find((s) => s && typeof s === 'object' && 'backgroundColor' in (s as object))
  return (match as { backgroundColor?: string } | undefined)?.backgroundColor
}

// Returns the most recently rendered TouchableRipple whose backgroundColor matches (i.e. its
// current props, regardless of how many earlier render passes are also sitting in the mock's call
// history).
function lastRippleWithColor(color: string) {
  const matches = (TouchableRipple as jest.Mock).mock.calls.map((c) => c[0]).filter((p) => styleBackgroundColor(p)?.toLowerCase() === color.toLowerCase())
  return matches[matches.length - 1]
}

// The swatch grid's own ScrollView carries { width, maxHeight } inline (see InlineColorPicker's
// own render) — the only element of its style array with a `width` key, same "find the one style
// object with this particular key" approach as styleBackgroundColor above.
function lastScrollViewSize(): { width?: number; maxHeight?: number } {
  const calls = (ScrollView as jest.Mock).mock.calls
  const props = calls[calls.length - 1][0] as { style?: unknown }
  const flat = [props.style].flat()
  const match = flat.find((s) => s && typeof s === 'object' && 'width' in (s as object))
  return (match as { width?: number; maxHeight?: number } | undefined) ?? {}
}

describe('InlineColorPicker', () => {
  it('renders only the trigger when closed, and the swatch grid once opened', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
      />
    )

    // Closed: none of the other 19 default colors have ever been rendered as a swatch.
    for (const color of defaultColors.slice(1)) {
      expect(lastRippleWithColor(color.value)).toBeUndefined()
    }
    expect(hostBox.host?.openId).toBeNull()

    act(() => triggerOnPress()())

    expect(hostBox.host?.openId).toBe('picker')
    // Open: every default color now renders as its own swatch TouchableRipple.
    for (const color of defaultColors) {
      expect(lastRippleWithColor(color.value)).toBeDefined()
    }
  })

  it('defaults swatches to defaultColors (20 items) once opened', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
      />
    )

    act(() => triggerOnPress()())

    for (const color of defaultColors) {
      expect(lastRippleWithColor(color.value)).toBeDefined()
    }
  })

  it('renders exactly as many swatches as a custom swatches array', () => {
    const hostBox = newHostBox()
    const swatches: SeedColor[] = [
      { label: 'A', value: '#111111' },
      { label: 'B', value: '#222222' },
      { label: 'C', value: '#333333' }
    ]
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={swatches[0].value}
        onChange={jest.fn()}
        swatches={swatches}
      />
    )

    act(() => triggerOnPress()())

    for (const swatch of swatches) {
      expect(lastRippleWithColor(swatch.value)).toBeDefined()
    }
    // None of the (unused, default) 20-color palette should show up.
    for (const color of defaultColors.filter((c) => !swatches.some((s) => s.value === c.value))) {
      expect(lastRippleWithColor(color.value)).toBeUndefined()
    }
  })

  it('accepts an explicit columns override and still renders every swatch', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        columns={3}
      />
    )

    act(() => triggerOnPress()())

    expect(hostBox.host?.openId).toBe('picker')
    for (const color of defaultColors) {
      expect(lastRippleWithColor(color.value)).toBeDefined()
    }
  })

  it('selecting a non-taken swatch calls onChange with its value and closes the picker (autoDismiss default)', () => {
    const hostBox = newHostBox()
    const onChange = jest.fn()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={onChange}
      />
    )

    act(() => triggerOnPress()())
    expect(hostBox.host?.openId).toBe('picker')

    const target = defaultColors[1].value
    const swatchProps = lastRippleWithColor(target)
    expect(swatchProps.disabled).toBeFalsy()

    act(() => swatchProps.onPress())

    expect(onChange).toHaveBeenCalledWith(target)
    expect(hostBox.host?.openId).toBeNull()
  })

  it('autoDismiss={false}: selecting a swatch does not close the picker', () => {
    const hostBox = newHostBox()
    const onChange = jest.fn()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={onChange}
        autoDismiss={false}
      />
    )

    act(() => triggerOnPress()())
    expect(hostBox.host?.openId).toBe('picker')

    const target = defaultColors[1].value
    const swatchProps = lastRippleWithColor(target)

    act(() => swatchProps.onPress())

    expect(onChange).toHaveBeenCalledWith(target)
    expect(hostBox.host?.openId).toBe('picker')
  })

  it('a taken swatch (without allowSwapTaken) renders disabled', () => {
    const hostBox = newHostBox()
    const takenValue = defaultColors[1].value
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        takenValue={takenValue}
      />
    )

    act(() => triggerOnPress()())

    const swatchProps = lastRippleWithColor(takenValue)
    expect(swatchProps.disabled).toBe(true)
  })

  it('a taken swatch with allowSwapTaken is not disabled and still fires onChange normally', () => {
    const hostBox = newHostBox()
    const onChange = jest.fn()
    const takenValue = defaultColors[1].value
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={onChange}
        takenValue={takenValue}
        allowSwapTaken
      />
    )

    act(() => triggerOnPress()())

    const swatchProps = lastRippleWithColor(takenValue)
    expect(swatchProps.disabled).toBe(false)

    act(() => swatchProps.onPress())
    expect(onChange).toHaveBeenCalledWith(takenValue)
  })

  it('renders a tag as text when provided, and no such text when omitted', () => {
    const hostBox = newHostBox()
    const { unmount } = render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        tag='JD'
      />
    )
    expect(screen.getByText('JD')).toBeTruthy()
    unmount()

    const hostBox2 = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox2.host = h
        }}
        id='picker2'
        value={defaultColors[0].value}
        onChange={jest.fn()}
      />
    )
    expect(screen.queryByText('JD')).toBeNull()
  })

  it('computes a larger tagFontSize ratio for an emoji tag than a plain-text tag', () => {
    const emojiHostBox = newHostBox()
    const { unmount } = render(
      <Harness
        onHost={(h) => {
          emojiHostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        tag='🎮'
      />
    )

    const emojiCalls = (Text as jest.Mock).mock.calls
    const emojiTextProps = emojiCalls[emojiCalls.length - 1][0]
    const emojiFontSize = [emojiTextProps.style].flat().find((s) => s && typeof s === 'object' && 'fontSize' in s)?.fontSize

    unmount()
    ;(Text as jest.Mock).mockClear()

    const plainHostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          plainHostBox.host = h
        }}
        id='picker2'
        value={defaultColors[0].value}
        onChange={jest.fn()}
        tag='JD'
      />
    )

    const plainCalls = (Text as jest.Mock).mock.calls
    const plainTextProps = plainCalls[plainCalls.length - 1][0]
    const plainFontSize = [plainTextProps.style].flat().find((s) => s && typeof s === 'object' && 'fontSize' in s)?.fontSize

    // default size is 48 -> 0.6 * 48 = 28.8 for an emoji tag, 0.4 * 48 = 19.2 for plain text.
    expect(emojiFontSize).toBeCloseTo(28.8)
    expect(plainFontSize).toBeCloseTo(19.2)
    expect(emojiFontSize).toBeGreaterThan(plainFontSize)
  })

  it('shows check/close icons on the selected/taken swatches, and no icon for a plain swatch', () => {
    const hostBox = newHostBox()
    const takenValue = defaultColors[1].value
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        takenValue={takenValue}
      />
    )

    act(() => triggerOnPress()())

    const iconSources = (Icon as jest.Mock).mock.calls.map((call) => call[0].source)
    expect(iconSources).toContain('check')
    expect(iconSources).toContain('close')
    expect(iconSources).not.toContain('swap-horizontal')
  })

  it('shows swap-horizontal instead of close for a taken-but-swappable swatch', () => {
    const hostBox = newHostBox()
    const takenValue = defaultColors[1].value
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        takenValue={takenValue}
        allowSwapTaken
      />
    )

    act(() => triggerOnPress()())

    const iconSources = (Icon as jest.Mock).mock.calls.map((call) => call[0].source)
    expect(iconSources).toContain('check')
    expect(iconSources).toContain('swap-horizontal')
    expect(iconSources).not.toContain('close')
  })

  describe('rotation', () => {
    afterEach(() => {
      ;(useRotation as jest.Mock).mockReturnValue(0)
    })

    it('passes a live useRotation() read to useAutoAlign when rotation is omitted', () => {
      ;(useRotation as jest.Mock).mockReturnValue(180)
      const hostBox = newHostBox()
      render(
        <Harness
          onHost={(h) => {
            hostBox.host = h
          }}
          value={defaultColors[0].value}
          onChange={jest.fn()}
        />
      )

      const calls = (useAutoAlign as jest.Mock).mock.calls
      expect(calls[calls.length - 1][3]).toBe(180)
    })

    it('passes an explicit rotation prop to useAutoAlign, overriding the ambient useRotation() value', () => {
      ;(useRotation as jest.Mock).mockReturnValue(180)
      const hostBox = newHostBox()
      render(
        <Harness
          onHost={(h) => {
            hostBox.host = h
          }}
          value={defaultColors[0].value}
          onChange={jest.fn()}
          rotation={-90}
        />
      )

      const calls = (useAutoAlign as jest.Mock).mock.calls
      expect(calls[calls.length - 1][3]).toBe(-90)
    })
  })

  describe('alignOverride', () => {
    it('renders successfully with a full alignOverride, ignoring its own useAutoAlign result entirely', () => {
      const hostBox = newHostBox()
      render(
        <Harness
          onHost={(h) => {
            hostBox.host = h
          }}
          value={defaultColors[0].value}
          onChange={jest.fn()}
          alignOverride={{ align: 'right', verticalAlign: 'above', maxHeight: 123, measured: true, triggerRef: { current: null } }}
        />
      )

      act(() => triggerOnPress()())

      expect(hostBox.host?.openId).toBe('picker')
      for (const color of defaultColors) {
        expect(lastRippleWithColor(color.value)).toBeDefined()
      }
    })

    it('still calls useAutoAlign unconditionally (hooks cannot be called conditionally) even when alignOverride is supplied', () => {
      const hostBox = newHostBox()
      render(
        <Harness
          onHost={(h) => {
            hostBox.host = h
          }}
          value={defaultColors[0].value}
          onChange={jest.fn()}
          alignOverride={{ align: 'right', verticalAlign: 'above', maxHeight: 123, measured: true, triggerRef: { current: null } }}
        />
      )

      expect(useAutoAlign).toHaveBeenCalled()
    })
  })
})

describe('getInlineColorPickerContentSize', () => {
  // 20 swatches (the defaultColors length, and what every real consumer passes) at a wide window
  // clamps to 5 auto columns -> 4 rows; a narrow window clamps to 4 auto columns -> 5 rows. These
  // are the same MIN_COLUMNS/MAX_COLUMNS/SCREEN_MARGIN/SWATCH_SIZE/SWATCHES_GAP boundaries the
  // component's own auto-column clamp uses internally.
  it('auto-picks 5 columns at a wide window and returns the matching width/height', () => {
    const { width, height } = getInlineColorPickerContentSize(20, 800)
    expect(width).toBe(184) // widthForColumns(5): 2*2 + 2*8 + 28*5 + 6*4
    expect(height).toBe(150) // 4 rows: 2*2 + 2*8 + 28*4 + 6*3
  })

  it('auto-picks 4 columns at a narrow window and returns the matching width/height', () => {
    const { width, height } = getInlineColorPickerContentSize(20, 200)
    expect(width).toBe(150) // widthForColumns(4): 2*2 + 2*8 + 28*4 + 6*3
    expect(height).toBe(184) // 5 rows: 2*2 + 2*8 + 28*5 + 6*4
  })

  it('respects an explicit columns override regardless of window width', () => {
    // A window wide enough to auto-pick 5 columns, but columns=3 is forced instead.
    const { width, height } = getInlineColorPickerContentSize(20, 800, 3)
    expect(width).toBe(116) // widthForColumns(3): 2*2 + 2*8 + 28*3 + 6*2
    expect(height).toBe(252) // ceil(20/3) = 7 rows: 2*2 + 2*8 + 28*7 + 6*6
  })

  // Cross-checks the standalone function against the actual rendered popover's own ScrollView size
  // (see lastScrollViewSize) for the same swatchCount/windowWidth/columns combinations, so this
  // export can never silently drift from what InlineColorPicker itself renders.
  it.each([
    { windowWidth: 800, columns: undefined, label: 'wide window, auto columns' },
    { windowWidth: 200, columns: undefined, label: 'narrow window, auto columns' },
    { windowWidth: 402, columns: 3, label: 'default window, explicit columns override' }
  ])("matches the rendered component's own swatch-grid size ($label)", ({ windowWidth, columns }) => {
    ;(useWindowDimensions as jest.Mock).mockReturnValue({ width: windowWidth, height: 874, scale: 3, fontScale: 1 })
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value={defaultColors[0].value}
        onChange={jest.fn()}
        columns={columns}
      />
    )

    act(() => triggerOnPress()())

    const { width: renderedWidth } = lastScrollViewSize()
    const expected = getInlineColorPickerContentSize(defaultColors.length, windowWidth, columns)
    expect(renderedWidth).toBe(expected.width)
  })
})
