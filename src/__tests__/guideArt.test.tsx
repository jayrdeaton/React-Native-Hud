import { render } from '@testing-library/react'
import { Icon, Text } from 'react-native-paper'
import { useReducedMotion } from 'react-native-reanimated'

import { mockViewRender } from '../__mocks__/react-native'
import { DirectionKeysHint } from '../guide/DirectionKeysHint'
import { SeatDevicesHint } from '../guide/SeatDevicesHint'
import { SeatDiagram } from '../guide/SeatDiagram'
import { SwipeHint } from '../guide/SwipeHint'

function labelledView(label: string) {
  return mockViewRender.mock.calls.find(([props]) => props.accessibilityLabel === label)
}

// react-native-paper's Text mock is a bare jest.fn — every rendered label is a captured call, and its
// `style` array is where the seat color lands (the last entry, the dynamic one).
function colorOfLabel(label: string): string | undefined {
  const call = (Text as jest.Mock).mock.calls.find(([props]) => props.children === label)
  const styles = call?.[0].style as Array<{ color?: string }> | undefined
  return styles?.find((s) => s.color !== undefined)?.color
}

describe('SwipeHint', () => {
  it('describes itself for screen readers, and defaults to swiping right', () => {
    const { unmount } = render(<SwipeHint />)

    expect(labelledView('Swipe right')).toBeDefined()
    unmount()
  })

  it.each([
    ['up', 'arrow-up'],
    ['down', 'arrow-down'],
    ['left', 'arrow-left'],
    ['right', 'arrow-right']
  ] as const)('swipe %s ends in the matching arrowhead', (direction, source) => {
    const { unmount } = render(<SwipeHint direction={direction} />)

    expect(labelledView(`Swipe ${direction}`)).toBeDefined()
    expect((Icon as jest.Mock).mock.calls.some(([props]) => props.source === source)).toBe(true)
    unmount()
  })

  it("tints with the theme's primary by default, and accepts an override", () => {
    const { unmount: unmountDefault } = render(<SwipeHint />)
    expect((Icon as jest.Mock).mock.calls[0][0].color).toBe('#000004') // colors.primary (see the mock)
    unmountDefault()
    ;(Icon as jest.Mock).mockClear()

    const { unmount: unmountOverride } = render(<SwipeHint color='#ff00ff' />)
    expect((Icon as jest.Mock).mock.calls[0][0].color).toBe('#ff00ff')
    unmountOverride()
  })

  it('lays the path out along the swipe axis, reversed for left and up', () => {
    const flexDirectionFor = (direction: 'up' | 'down' | 'left' | 'right') => {
      mockViewRender.mockClear()
      const { unmount } = render(<SwipeHint direction={direction} />)
      const style = labelledView(`Swipe ${direction}`)![0].style as Array<{ flexDirection?: string }>
      unmount()
      return style.find((s) => s.flexDirection !== undefined)?.flexDirection
    }

    expect(flexDirectionFor('right')).toBe('row')
    expect(flexDirectionFor('left')).toBe('row-reverse')
    expect(flexDirectionFor('down')).toBe('column')
    expect(flexDirectionFor('up')).toBe('column-reverse')
  })

  it("draws a mouse instead of a fingertip ring for pointer='mouse', and never says swipe", () => {
    const { unmount } = render(<SwipeHint pointer='mouse' direction='up' />)

    expect(labelledView('Drag up')).toBeDefined()
    expect(labelledView('Swipe up')).toBeUndefined()
    expect((Icon as jest.Mock).mock.calls.some(([props]) => props.source === 'mouse')).toBe(true)
    unmount()
  })

  it('renders under reduced motion too (the ring rests instead of sweeping)', () => {
    ;(useReducedMotion as jest.Mock).mockReturnValue(true)
    const { unmount } = render(<SwipeHint />)

    expect(labelledView('Swipe right')).toBeDefined()
    unmount()
    ;(useReducedMotion as jest.Mock).mockReturnValue(false)
  })
})

describe('SeatDiagram', () => {
  it('labels both halves, defaulting to P1 on the bottom and P2 on top', () => {
    const { container, unmount } = render(<SeatDiagram />)

    expect(container.textContent).toContain('P1')
    expect(container.textContent).toContain('P2')
    expect(labelledView('P1 plays the bottom half, P2 plays the top half')).toBeDefined()
    unmount()
  })

  it("colors each half from the theme's primary (bottom) and secondary (top) by default", () => {
    const { unmount } = render(<SeatDiagram />)

    expect(colorOfLabel('P1')).toBe('#000004') // colors.primary
    expect(colorOfLabel('P2')).toBe('#000005') // colors.secondary
    unmount()
  })

  it('accepts explicit seat colors and labels', () => {
    const { container, unmount } = render(<SeatDiagram topColor='#111111' bottomColor='#222222' topLabel='Blue' bottomLabel='Red' />)

    expect(container.textContent).toContain('Blue')
    expect(container.textContent).toContain('Red')
    expect(colorOfLabel('Blue')).toBe('#111111')
    expect(colorOfLabel('Red')).toBe('#222222')
    unmount()
  })

  it('flips the top label upside down, the way that player actually reads it', () => {
    const { unmount } = render(<SeatDiagram />)

    const topCall = (Text as jest.Mock).mock.calls.find(([props]) => props.children === 'P2')
    const bottomCall = (Text as jest.Mock).mock.calls.find(([props]) => props.children === 'P1')
    const flips = (call: [{ style: Array<{ transform?: Array<{ rotate: string }> }> }]) => call[0].style.some((s) => s.transform?.some((t) => t.rotate === '180deg'))
    expect(flips(topCall)).toBe(true)
    expect(flips(bottomCall)).toBe(false)
    unmount()
  })
})

describe('DirectionKeysHint', () => {
  it('draws the arrow keys as arrow icons by default', () => {
    const { unmount } = render(<DirectionKeysHint />)

    expect(labelledView('Arrow keys')).toBeDefined()
    const sources = (Icon as jest.Mock).mock.calls.map(([props]) => props.source)
    expect(sources).toEqual(['arrow-up', 'arrow-left', 'arrow-down', 'arrow-right'])
    unmount()
  })

  it("prints a seat's own keys on the caps instead, in inverted-T order", () => {
    const { container, unmount } = render(<DirectionKeysHint labels={{ up: 'W', left: 'A', down: 'S', right: 'D' }} />)

    expect(container.textContent).toBe('WASD')
    expect(labelledView('Keys W, A, S, D')).toBeDefined()
    expect(Icon as jest.Mock).not.toHaveBeenCalled()
    unmount()
  })

  it("draws only up over down for axis='vertical' (a paddle that only moves one way)", () => {
    const { container, unmount } = render(<DirectionKeysHint axis='vertical' labels={{ up: 'W', down: 'S' }} />)

    expect(container.textContent).toBe('WS')
    expect(labelledView('Keys W and S')).toBeDefined()
    unmount()
    ;(Icon as jest.Mock).mockClear()

    const arrows = render(<DirectionKeysHint axis='vertical' />)
    expect(labelledView('Up and down arrow keys')).toBeDefined()
    expect((Icon as jest.Mock).mock.calls.map(([props]) => props.source)).toEqual(['arrow-up', 'arrow-down'])
    arrows.unmount()
  })

  it("tints with the theme's primary by default, and accepts an override", () => {
    const { unmount: unmountDefault } = render(<DirectionKeysHint />)
    expect((Icon as jest.Mock).mock.calls[0][0].color).toBe('#000004') // colors.primary
    unmountDefault()
    ;(Icon as jest.Mock).mockClear()

    const { unmount: unmountOverride } = render(<DirectionKeysHint labels={{ up: 'I', left: 'J', down: 'K', right: 'L' }} color='#ff00ff' />)
    expect(colorOfLabel('I')).toBe('#ff00ff')
    unmountOverride()
  })
})

describe('SeatDevicesHint', () => {
  const sources = () => (Icon as jest.Mock).mock.calls.map(([props]) => ({ source: props.source, color: props.color }))

  it("tints each device in the color of the one seat using it (the fleet's P1-mouse, P2-keys default)", () => {
    const { unmount } = render(<SeatDevicesHint devices={['mouse', 'keyboard']} />)

    expect(labelledView('Player 1 uses the mouse, Player 2 uses the keyboard')).toBeDefined()
    expect(sources()).toEqual([
      { source: 'keyboard-outline', color: '#000005' }, // colors.secondary: player 2's keyboard
      { source: 'mouse-outline', color: '#000004' } // colors.primary: player 1's mouse
    ])
    unmount()
  })

  it('draws one neutral keyboard when both seats share it', () => {
    const { unmount } = render(<SeatDevicesHint devices={['keyboard', 'keyboard']} />)

    expect(sources()).toEqual([{ source: 'keyboard-outline', color: '#000002' }]) // colors.onSurface
    unmount()
  })

  it('accepts explicit seat colors', () => {
    const { unmount } = render(<SeatDevicesHint devices={['keyboard', 'mouse']} seatColors={['#111111', '#222222']} />)

    expect(sources()).toEqual([
      { source: 'keyboard-outline', color: '#111111' },
      { source: 'mouse-outline', color: '#222222' }
    ])
    unmount()
  })
})
