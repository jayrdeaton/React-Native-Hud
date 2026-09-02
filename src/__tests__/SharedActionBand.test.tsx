import { IconButton } from '@rific/feedback-press'
import { render, screen } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { SharedActionBand } from '../SharedActionBand'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

describe('SharedActionBand', () => {
  it('renders back + settings only when onRandomize/onReset are omitted', () => {
    render(
      <SharedActionBand onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' popoverOpen={false}>
        <Text>options</Text>
      </SharedActionBand>
    )

    const icons = (IconButton as jest.Mock).mock.calls.map((c) => c[0].icon)
    expect(icons).toEqual(['arrow-left', 'cog'])
  })

  it('renders all four actions, in order, when onRandomize/onReset are both provided', () => {
    render(
      <SharedActionBand onBack={jest.fn()} onSettings={jest.fn()} onRandomize={jest.fn()} onReset={jest.fn()} fg='#ffffff' popoverOpen={false}>
        <Text>options</Text>
      </SharedActionBand>
    )

    const icons = (IconButton as jest.Mock).mock.calls.map((c) => c[0].icon)
    expect(icons).toEqual(['arrow-left', 'dice-multiple', 'restore', 'cog'])
  })

  it('invokes each handler exactly once when its captured onPress fires', () => {
    const onBack = jest.fn()
    const onSettings = jest.fn()
    const onRandomize = jest.fn()
    const onReset = jest.fn()
    render(
      <SharedActionBand onBack={onBack} onSettings={onSettings} onRandomize={onRandomize} onReset={onReset} fg='#ffffff' popoverOpen={false}>
        <Text>options</Text>
      </SharedActionBand>
    )

    const [back, randomize, reset, settings] = (IconButton as jest.Mock).mock.calls.map((c) => c[0])
    back.onPress()
    randomize.onPress()
    reset.onPress()
    settings.onPress()

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onRandomize).toHaveBeenCalledTimes(1)
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('renders its children below the action row', () => {
    render(
      <SharedActionBand onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' popoverOpen={false}>
        <Text>the option row</Text>
      </SharedActionBand>
    )

    expect(screen.getByText('the option row')).toBeTruthy()
  })

  it('elevates the column only when popoverOpen is true', () => {
    // The outer column View always carries the base { alignItems:'center', gap:8 } style — a
    // stable object reference, since this mock's StyleSheet.create is the identity function —
    // making it findable regardless of how many other Views the render tree also mocks.
    const isColumnCall = (call: unknown[]) => flatten((call[0] as { style?: unknown }).style).some((s) => s.alignItems === 'center' && s.gap === 8)

    mockViewRender.mockClear()
    render(
      <SharedActionBand onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' popoverOpen={false}>
        <Text>options</Text>
      </SharedActionBand>
    )
    const closedColumn = mockViewRender.mock.calls.find(isColumnCall)
    expect(closedColumn).toBeDefined()
    expect(flatten((closedColumn![0] as { style?: unknown }).style).some((s) => s.zIndex === 100)).toBe(false)

    mockViewRender.mockClear()
    render(
      <SharedActionBand onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' popoverOpen>
        <Text>options</Text>
      </SharedActionBand>
    )
    const openColumn = mockViewRender.mock.calls.find(isColumnCall)
    expect(openColumn).toBeDefined()
    expect(flatten((openColumn![0] as { style?: unknown }).style).some((s) => s.zIndex === 100)).toBe(true)
  })
})
