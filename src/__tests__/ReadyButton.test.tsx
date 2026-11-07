import { TouchableRipple } from '@rific/feedback-press'
import { render, screen } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { MONO_FONT } from '../fonts'
import { ReadyButton } from '../ReadyButton'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

describe('ReadyButton', () => {
  it('renders the unready label and omits the ready background color', () => {
    render(<ReadyButton color='#ff0000' ready={false} onToggleReady={jest.fn()} />)

    expect(screen.getByText('READY?')).toBeTruthy()

    const props = (TouchableRipple as jest.Mock).mock.calls[0][0]
    const entries = flatten(props.style)
    expect(entries.some((entry) => entry.backgroundColor === '#ff0000')).toBe(false)
  })

  it('renders the ready check-mark label and includes the ready background color', () => {
    render(<ReadyButton color='#00ff00' ready onToggleReady={jest.fn()} />)

    expect(screen.getByText('READY ✓')).toBeTruthy()

    const props = (TouchableRipple as jest.Mock).mock.calls[0][0]
    const entries = flatten(props.style)
    expect(entries.some((entry) => entry.backgroundColor === '#00ff00')).toBe(true)
  })

  it('invokes onToggleReady exactly once when the captured onPress fires', () => {
    const onToggleReady = jest.fn()
    render(<ReadyButton color='#0000ff' ready={false} onToggleReady={onToggleReady} />)

    const props = (TouchableRipple as jest.Mock).mock.calls[0][0]
    props.onPress()

    expect(onToggleReady).toHaveBeenCalledTimes(1)
  })

  it('uses an explicit labelFontFamily when provided', () => {
    render(<ReadyButton color='#123456' ready={false} onToggleReady={jest.fn()} labelFontFamily='Courier' />)

    const props = (Text as jest.Mock).mock.calls[0][0]
    const entries = flatten(props.style)
    expect(entries.some((entry) => entry.fontFamily === 'Courier')).toBe(true)
  })

  it('falls back to MONO_FONT when labelFontFamily is omitted', () => {
    render(<ReadyButton color='#123456' ready={false} onToggleReady={jest.fn()} />)

    const props = (Text as jest.Mock).mock.calls[0][0]
    const entries = flatten(props.style)
    expect(entries.some((entry) => entry.fontFamily === MONO_FONT)).toBe(true)
  })

  it('appends the style prop into the TouchableRipple style array', () => {
    const distinctiveStyle = { marginTop: 42 }
    render(<ReadyButton color='#123456' ready={false} onToggleReady={jest.fn()} style={distinctiveStyle} />)

    const props = (TouchableRipple as jest.Mock).mock.calls[0][0]
    const entries = flatten(props.style)
    expect(entries).toContainEqual(distinctiveStyle)
  })

  describe('the pill look (surfaceColor), for a loadout over a backdrop', () => {
    const rippleProps = () => (TouchableRipple as jest.Mock).mock.calls.at(-1)![0]
    const textProps = () => (Text as jest.Mock).mock.calls.at(-1)![0]

    it('is a pill on the surface, the size of a seat button, its label black in light mode', () => {
      render(<ReadyButton color='#9d2d53' ready={false} onToggleReady={jest.fn()} surfaceColor='#fffbff' />)

      expect(screen.getByText('READY?')).toBeTruthy()
      const box = Object.assign({}, ...flatten(rippleProps().style))
      expect(box).toMatchObject({ backgroundColor: '#fffbff', borderRadius: 22, height: 44 })
      expect(box.borderWidth).toBeUndefined()
      const label = Object.assign({}, ...flatten(textProps().style))
      expect(label).toMatchObject({ color: '#000000', fontSize: 13, fontWeight: '700', letterSpacing: 1 })
    })

    it("keeps the theme's font rather than the mono one, unless a font is passed", () => {
      const { unmount } = render(<ReadyButton color='#9d2d53' ready={false} onToggleReady={jest.fn()} surfaceColor='#fffbff' />)
      expect(flatten(textProps().style).some((entry) => 'fontFamily' in entry)).toBe(false)
      unmount()

      render(<ReadyButton color='#9d2d53' ready={false} onToggleReady={jest.fn()} surfaceColor='#fffbff' labelFontFamily='Serif' />)
      expect(flatten(textProps().style).some((entry) => entry.fontFamily === 'Serif')).toBe(true)
    })

    it('labels white in dark mode', () => {
      render(<ReadyButton color='#9d2d53' ready={false} onToggleReady={jest.fn()} surfaceColor='#1d1b1e' dark />)
      expect(Object.assign({}, ...flatten(textProps().style)).color).toBe('#FFFFFF')
    })

    it("fills with the seat's color once ready, its label in that color's ink", () => {
      render(<ReadyButton color='#9d2d53' ready onToggleReady={jest.fn()} surfaceColor='#fffbff' />)

      expect(screen.getByText('READY ✓')).toBeTruthy()
      expect(Object.assign({}, ...flatten(rippleProps().style)).backgroundColor).toBe('#9d2d53')
      expect(Object.assign({}, ...flatten(textProps().style)).color).toBe('#9d2d53/ink')
    })

    it('toggles, and still takes the caller style last', () => {
      const onToggleReady = jest.fn()
      const hidden = { opacity: 0 }
      render(<ReadyButton color='#9d2d53' ready={false} onToggleReady={onToggleReady} surfaceColor='#fffbff' style={hidden} />)

      rippleProps().onPress()
      expect(onToggleReady).toHaveBeenCalledTimes(1)
      expect(flatten(rippleProps().style).at(-1)).toEqual(hidden)
    })
  })
})
