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
})
