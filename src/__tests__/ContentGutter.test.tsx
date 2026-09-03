import { render } from '@testing-library/react'

import { mockViewRender, useWindowDimensions } from '../__mocks__/react-native'
import { ContentGutter } from '../ContentGutter'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

// Row order is fixed by ContentGutter's own JSX: [0] the outer row, [1] the left gutter, [2] the
// content column, [3] the right gutter. Children below are deliberately plain strings (not <View>s)
// so none of them add extra mockViewRender calls of their own and this ordering stays exact.
const widthOf = (callIndex: number) => flatten(mockViewRender.mock.calls[callIndex]?.[0]?.style).find((e) => 'width' in e)?.width

describe('ContentGutter', () => {
  it('renders children at the full window width with no gutters, below maxContentWidth', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValueOnce({ width: 800, height: 874, scale: 1, fontScale: 1 })
    render(<ContentGutter maxContentWidth={1040}>board</ContentGutter>)

    expect(widthOf(1)).toBe(0)
    expect(widthOf(2)).toBe(800)
    expect(widthOf(3)).toBe(0)
  })

  it('clamps content to maxContentWidth and splits the leftover into two equal gutters, above it', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValueOnce({ width: 2000, height: 874, scale: 1, fontScale: 1 })
    render(<ContentGutter maxContentWidth={1040}>board</ContentGutter>)

    expect(widthOf(1)).toBe(480)
    expect(widthOf(2)).toBe(1040)
    expect(widthOf(3)).toBe(480)
  })

  it('is unclamped (full window width, zero gutters) when maxContentWidth is omitted', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValueOnce({ width: 2000, height: 874, scale: 1, fontScale: 1 })
    render(<ContentGutter>board</ContentGutter>)

    expect(widthOf(1)).toBe(0)
    expect(widthOf(2)).toBe(2000)
    expect(widthOf(3)).toBe(0)
  })

  it('renders leftGutter/rightGutter as the gutter Views’ own children', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValueOnce({ width: 2000, height: 874, scale: 1, fontScale: 1 })
    render(
      <ContentGutter maxContentWidth={1040} leftGutter='wall-left' rightGutter='wall-right'>
        board
      </ContentGutter>
    )

    expect(mockViewRender.mock.calls[1][0].children).toBe('wall-left')
    expect(mockViewRender.mock.calls[3][0].children).toBe('wall-right')
  })
})
