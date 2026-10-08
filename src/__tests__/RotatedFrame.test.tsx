import { FakeLandscapeView, useRotation } from '@tastic/core'
import { render } from '@testing-library/react'
import { useContext, useEffect } from 'react'
import { useWindowDimensions, type ViewStyle } from 'react-native'
import { Portal } from 'react-native-paper'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'

import { mockViewRender } from '../__mocks__/react-native'
import { RotatedFrame } from '../RotatedFrame'

const RAW_INSETS = { top: 59, right: 0, bottom: 34, left: 0 }

// Records the insets the frame provides to its children.
const seenInsets = jest.fn()
function InsetsProbe() {
  seenInsets(useContext(SafeAreaInsetsContext))
  return null
}

function frameProps() {
  const calls = (FakeLandscapeView as unknown as jest.Mock).mock.calls
  return calls[calls.length - 1][0]
}

// The content column is the View rendered directly around the probe: the last View call.
function columnProps() {
  const calls = mockViewRender.mock.calls
  return calls[calls.length - 1][0]
}

// This package's react-native mock keeps StyleSheet.flatten an identity, so merge the array here.
function columnStyle(): ViewStyle {
  const style = columnProps().style as ViewStyle | (ViewStyle | false)[]
  return Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style
}

describe('RotatedFrame', () => {
  beforeEach(() => {
    ;(FakeLandscapeView as unknown as jest.Mock).mockClear()
    mockViewRender.mockClear()
    ;(Portal.Host as unknown as jest.Mock).mockClear()
    seenInsets.mockClear()
    ;(useSafeAreaInsets as jest.Mock).mockReturnValue(RAW_INSETS)
  })

  afterEach(() => {
    ;(useRotation as jest.Mock).mockReturnValue(0)
    ;(useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('turns by the live rotation when none is passed', () => {
    ;(useRotation as jest.Mock).mockReturnValue(-90)
    render(
      <RotatedFrame>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(frameProps().rotation).toBe(-90)
  })

  it('an explicit rotation wins over the live one', () => {
    ;(useRotation as jest.Mock).mockReturnValue(180)
    render(
      <RotatedFrame rotation={90}>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(frameProps().rotation).toBe(90)
  })

  it('passes the raw insets through by default', () => {
    render(
      <RotatedFrame rotation={90}>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(seenInsets).toHaveBeenLastCalledWith(RAW_INSETS)
  })

  it('remaps the insets onto the turned edges with rotatedSafeArea', () => {
    render(
      <RotatedFrame rotation={90} rotatedSafeArea>
        <InsetsProbe />
      </RotatedFrame>
    )
    // Turned 90: the notch (physical top) is on the frame's left, the home indicator on its right.
    expect(seenInsets).toHaveBeenLastCalledWith({ top: 0, right: 34, bottom: 0, left: 59 })
  })

  it('leaves the insets alone at 0 even with rotatedSafeArea', () => {
    render(
      <RotatedFrame rotation={0} rotatedSafeArea>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(seenInsets).toHaveBeenLastCalledWith(RAW_INSETS)
  })

  it('mounts a Portal.Host inside the frame only with portalHost', () => {
    const { unmount } = render(
      <RotatedFrame>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(Portal.Host).not.toHaveBeenCalled()
    unmount()

    render(
      <RotatedFrame portalHost>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(Portal.Host).toHaveBeenCalled()
  })

  it('makes the frame and the column box-none with passThrough', () => {
    render(
      <RotatedFrame passThrough>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(frameProps().passThrough).toBe(true)
    expect(columnProps().pointerEvents).toBe('box-none')
  })

  it('leaves touches alone without passThrough', () => {
    render(
      <RotatedFrame>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(frameProps().passThrough).toBe(false)
    expect(columnProps().pointerEvents).toBeUndefined()
  })

  it('caps the column only when the turned footprint is wide', () => {
    ;(useWindowDimensions as jest.Mock).mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 1 })
    const { unmount } = render(
      <RotatedFrame rotation={0} maxContentWidth={640}>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(columnStyle().maxWidth).toBeUndefined()
    unmount()

    render(
      <RotatedFrame rotation={90} maxContentWidth={640}>
        <InsetsProbe />
      </RotatedFrame>
    )
    expect(columnStyle().maxWidth).toBe(640)
  })

  it('keeps its children mounted across every angle', () => {
    const mounted = jest.fn()
    const unmounted = jest.fn()
    function Probe() {
      useMountLog(mounted, unmounted)
      return null
    }
    const { rerender } = render(
      <RotatedFrame rotation={0} rotatedSafeArea portalHost passThrough>
        <Probe />
      </RotatedFrame>
    )
    for (const rotation of [90, -90, 180, 0] as const) {
      rerender(
        <RotatedFrame rotation={rotation} rotatedSafeArea portalHost passThrough>
          <Probe />
        </RotatedFrame>
      )
    }
    expect(mounted).toHaveBeenCalledTimes(1)
    expect(unmounted).not.toHaveBeenCalled()
  })
})

function useMountLog(mounted: () => void, unmounted: () => void) {
  useEffect(() => {
    mounted()
    return unmounted
  }, [mounted, unmounted])
}
