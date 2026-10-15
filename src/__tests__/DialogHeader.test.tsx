import { useRotation } from '@tastic/core'
import { act, render } from '@testing-library/react'
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { COMPACT_DIALOG_HEIGHT, DialogHeader, isCompactDialogHeight } from '../DialogHeader'
import { useCompactDialog } from '../useCompactDialog'

function lastIconProps() {
  return (Icon as jest.Mock).mock.lastCall![0]
}

function lastTitleProps() {
  return (Text as jest.Mock).mock.lastCall![0]
}

describe('DialogHeader', () => {
  it('draws a 64pt icon over a large bold title, both in the theme primary by default', () => {
    const { container, unmount } = render(<DialogHeader icon='cog' title='Settings' />)

    expect(container.textContent).toBe('Settings')
    expect(lastIconProps()).toMatchObject({ source: 'cog', size: 64, color: '#000004' }) // colors.primary
    expect(lastTitleProps()).toMatchObject({ variant: 'headlineLarge', accessibilityRole: 'header' })
    expect([lastTitleProps().style].flat(Infinity)).toContainEqual({ color: '#000004' })
    unmount()
  })

  it('takes an accent of its own (ConfirmDialog passes its danger role)', () => {
    const { unmount } = render(<DialogHeader icon='alert-outline' title='Delete Profile?' color='#00000b' />)

    expect(lastIconProps().color).toBe('#00000b')
    expect([lastTitleProps().style].flat(Infinity)).toContainEqual({ color: '#00000b' })
    unmount()
  })

  it('compact: a half-size icon beside a smaller title, so a short sheet keeps its reading room', () => {
    const { unmount } = render(<DialogHeader icon='cog' title='Settings' compact />)

    expect(lastIconProps().size).toBe(32)
    expect(lastTitleProps().variant).toBe('headlineSmall')
    unmount()
  })
})

describe('isCompactDialogHeight', () => {
  it('is compact for a phone held sideways, not for a small phone upright or an iPad', () => {
    expect(COMPACT_DIALOG_HEIGHT).toBe(528)
    for (const short of [320, 360, 375, 402, 430, 527]) expect(isCompactDialogHeight(short)).toBe(true)
    for (const tall of [528, 568, 640, 768, 874]) expect(isCompactDialogHeight(tall)).toBe(false)
  })
})

function Probe({ rotation, onResult }: { rotation?: 0 | 90 | -90 | 180; onResult: (result: ReturnType<typeof useCompactDialog>) => void }) {
  onResult(useCompactDialog(rotation))
  return null
}

function layout(width: number, height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height } } } as LayoutChangeEvent
}

describe('useCompactDialog', () => {
  afterEach(() => {
    ;(useRotation as jest.Mock).mockReturnValue(0)
  })

  it('before layout, an upright card guesses it sits in a frame turned by the live rotation', () => {
    const onResult = jest.fn()
    const { unmount } = render(<Probe onResult={onResult} />)
    expect(onResult.mock.lastCall[0].compact).toBe(false)
    unmount()

    ;(useRotation as jest.Mock).mockReturnValue(90)
    const { unmount: unmountTurned } = render(<Probe onResult={onResult} />)
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    unmountTurned()
  })

  it('before layout, a card that turns itself guesses it sits at the upright root', () => {
    // The live rotation is ignored: a self-turned card is portaled to the root, outside any frame.
    ;(useRotation as jest.Mock).mockReturnValue(90)
    const onResult = jest.fn()
    const { unmount } = render(<Probe rotation={90} onResult={onResult} />)
    // 402 x 874 window: a quarter-turned card's height is the window's 402pt width.
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    unmount()

    const { unmount: unmountUpsideDown } = render(<Probe rotation={180} onResult={onResult} />)
    expect(onResult.mock.lastCall[0].compact).toBe(false)
    unmountUpsideDown()
  })

  it('once the backdrop has laid out, its measured size decides, along the card own vertical axis', () => {
    const onResult = jest.fn()
    const { unmount } = render(<Probe onResult={onResult} />)

    act(() => onResult.mock.lastCall[0].onLayout(layout(874, 402)))
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    act(() => onResult.mock.lastCall[0].onLayout(layout(402, 874)))
    expect(onResult.mock.lastCall[0].compact).toBe(false)
    unmount()

    const { unmount: unmountTurned } = render(<Probe rotation={-90} onResult={onResult} />)
    act(() => onResult.mock.lastCall[0].onLayout(layout(402, 874)))
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    unmountTurned()
  })

  it('a resize after the first layout is followed', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValueOnce({ width: 874, height: 402, scale: 3, fontScale: 1 })
    const onResult = jest.fn()
    const { unmount } = render(<Probe onResult={onResult} />)

    act(() => onResult.mock.lastCall[0].onLayout(layout(874, 402)))
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    act(() => onResult.mock.lastCall[0].onLayout(layout(1024, 768)))
    expect(onResult.mock.lastCall[0].compact).toBe(false)
    unmount()
  })
})
