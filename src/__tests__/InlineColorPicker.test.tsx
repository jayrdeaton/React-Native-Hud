import { defaultColors, SeedColor } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { act, render, screen } from '@testing-library/react'
import { Icon, Text } from 'react-native-paper'

import { InlineColorPicker } from '../InlineColorPicker'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

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
})
