import { render } from '@testing-library/react'
import { useWindowDimensions, type ViewStyle } from 'react-native'
import { Portal } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { ScreenFrame } from '../ScreenFrame'

function Probe() {
  return null
}

// The frame's own root is the first View rendered; the content column is the last (directly around the probe).
function rootProps() {
  return mockViewRender.mock.calls[0][0]
}

function columnProps() {
  const calls = mockViewRender.mock.calls
  return calls[calls.length - 1][0]
}

// This package's react-native mock keeps StyleSheet.flatten an identity, so merge the array here.
function columnStyle(): ViewStyle {
  const style = columnProps().style as ViewStyle | (ViewStyle | false)[]
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style
}

describe('ScreenFrame', () => {
  beforeEach(() => {
    mockViewRender.mockClear()
    ;(Portal.Host as unknown as jest.Mock).mockClear()
  })

  afterEach(() => {
    ;(useWindowDimensions as jest.Mock).mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 1 })
  })

  it('mounts a Portal.Host inside the frame only with portalHost', () => {
    const { unmount } = render(
      <ScreenFrame>
        <Probe />
      </ScreenFrame>
    )
    expect(Portal.Host).not.toHaveBeenCalled()
    unmount()

    render(
      <ScreenFrame portalHost>
        <Probe />
      </ScreenFrame>
    )
    expect(Portal.Host).toHaveBeenCalled()
  })

  it('makes the frame and the column box-none with passThrough', () => {
    render(
      <ScreenFrame passThrough>
        <Probe />
      </ScreenFrame>
    )
    expect(rootProps().pointerEvents).toBe('box-none')
    expect(columnProps().pointerEvents).toBe('box-none')
  })

  it('leaves touches alone without passThrough', () => {
    render(
      <ScreenFrame>
        <Probe />
      </ScreenFrame>
    )
    expect(rootProps().pointerEvents).toBeUndefined()
    expect(columnProps().pointerEvents).toBeUndefined()
  })

  it('caps the column only in a landscape window', () => {
    const { unmount } = render(
      <ScreenFrame maxContentWidth={640}>
        <Probe />
      </ScreenFrame>
    )
    expect(columnStyle().maxWidth).toBeUndefined()
    unmount()

    ;(useWindowDimensions as jest.Mock).mockReturnValue({ width: 874, height: 402, scale: 3, fontScale: 1 })
    render(
      <ScreenFrame maxContentWidth={640}>
        <Probe />
      </ScreenFrame>
    )
    expect(columnStyle().maxWidth).toBe(640)
  })

  it('leaves the column uncapped without maxContentWidth, even in a landscape window', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValue({ width: 874, height: 402, scale: 3, fontScale: 1 })
    render(
      <ScreenFrame>
        <Probe />
      </ScreenFrame>
    )
    expect(columnStyle().maxWidth).toBeUndefined()
  })
})
