import { act, render } from '@testing-library/react'
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { COMPACT_DIALOG_HEIGHT, DialogHeader, DialogHeaderStyleProvider, isCompactDialogHeight } from '../DialogHeader'
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

  it('takes an icon color of its own, leaving the title in the accent', () => {
    const { unmount } = render(<DialogHeader icon='flag' title='Forfeit?' color='#00000b' iconColor='#ffffff' />)

    expect(lastIconProps().color).toBe('#ffffff')
    expect([lastTitleProps().style].flat(Infinity)).toContainEqual({ color: '#00000b' })
    unmount()
  })

  it('compact: a half-size icon beside a smaller title, so a short sheet keeps its reading room', () => {
    const { unmount } = render(<DialogHeader icon='cog' title='Settings' compact />)

    expect(lastIconProps().size).toBe(32)
    expect(lastTitleProps().variant).toBe('headlineSmall')
    unmount()
  })

  it("quiet: a small icon in the accent beside a plain title in the game's own lettering", () => {
    const lettering = { fontWeight: '900' as const, letterSpacing: 3, textTransform: 'uppercase' as const }
    const { container, unmount } = render(
      <DialogHeaderStyleProvider tone='quiet' titleStyle={lettering}>
        <DialogHeader icon='trash-can-outline' title='Delete Battle?' color='#00000b' />
      </DialogHeaderStyleProvider>
    )

    expect(container.textContent).toBe('Delete Battle?')
    expect(lastIconProps()).toMatchObject({ source: 'trash-can-outline', size: 22, color: '#00000b' })
    expect(lastTitleProps()).toMatchObject({ variant: 'titleLarge', accessibilityRole: 'header' })
    const style = [lastTitleProps().style].flat(Infinity)
    expect(style).toContainEqual({ color: '#000002' }) // colors.onSurface, not the accent
    expect(style).not.toContainEqual({ color: '#00000b' })
    expect(style).toContainEqual(lettering)
    unmount()
  })

  it('quiet: keeps an icon color of its own, and looks the same compact', () => {
    const { unmount } = render(
      <DialogHeaderStyleProvider tone='quiet'>
        <DialogHeader icon='flag' title='Forfeit?' color='#00000b' iconColor='#ffffff' compact />
      </DialogHeaderStyleProvider>
    )

    expect(lastIconProps()).toMatchObject({ size: 22, color: '#ffffff' })
    expect(lastTitleProps().variant).toBe('titleLarge')
    unmount()
  })

  it('standard under the provider looks as it always has, ignoring the lettering', () => {
    const lettering = { letterSpacing: 9 }
    const { unmount } = render(
      <DialogHeaderStyleProvider tone='standard' titleStyle={lettering}>
        <DialogHeader icon='cog' title='Settings' />
      </DialogHeaderStyleProvider>
    )

    expect(lastIconProps().size).toBe(64)
    expect([lastTitleProps().style].flat(Infinity)).not.toContainEqual(lettering)
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

function Probe({ onResult }: { onResult: (result: ReturnType<typeof useCompactDialog>) => void }) {
  onResult(useCompactDialog())
  return null
}

function layout(width: number, height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height } } } as LayoutChangeEvent
}

describe('useCompactDialog', () => {
  it('before layout, it guesses the window', () => {
    const onResult = jest.fn()
    const { unmount } = render(<Probe onResult={onResult} />)
    expect(onResult.mock.lastCall[0].compact).toBe(false)
    unmount()

    ;(useWindowDimensions as jest.Mock).mockReturnValueOnce({ width: 874, height: 402, scale: 3, fontScale: 1 })
    const { unmount: unmountLandscape } = render(<Probe onResult={onResult} />)
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    unmountLandscape()
  })

  it('once the backdrop has laid out, its measured height decides', () => {
    const onResult = jest.fn()
    const { unmount } = render(<Probe onResult={onResult} />)

    act(() => onResult.mock.lastCall[0].onLayout(layout(874, 402)))
    expect(onResult.mock.lastCall[0].compact).toBe(true)
    act(() => onResult.mock.lastCall[0].onLayout(layout(402, 874)))
    expect(onResult.mock.lastCall[0].compact).toBe(false)
    unmount()
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
