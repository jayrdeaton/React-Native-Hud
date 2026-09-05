import { render } from '@testing-library/react'
import { Icon } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { CornerStatusBadges } from '../CornerStatusBadges'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

// The wrapping per-seat View (pointerEvents='none', one of the four corner styles) — distinct from
// each badge's own inner View (no pointerEvents, the shared circular `badge` style) — so a test can
// count/inspect just the positioning wrapper regardless of how many other Views also rendered.
const cornerViewCalls = () => (mockViewRender as jest.Mock).mock.calls.filter((c) => (c[0] as { pointerEvents?: string }).pointerEvents === 'none')
const cornerStyles = (call: unknown[]) => flatten((call[0] as { style?: unknown }).style)

describe('CornerStatusBadges', () => {
  it('omits a seat badge entirely when that seat is not provided', () => {
    render(<CornerStatusBadges orientationMode='faceToFace' p1OnRight p1={{ icon: 'sword' }} />)
    expect(cornerViewCalls()).toHaveLength(1)
  })

  it('renders both seats when both are provided, with an empty seat producing no Icon', () => {
    render(<CornerStatusBadges orientationMode='faceToFace' p1OnRight p1={{ icon: 'sword' }} p2={{}} />)

    expect(cornerViewCalls()).toHaveLength(2)
    const iconCalls = (Icon as jest.Mock).mock.calls.map((c) => c[0])
    expect(iconCalls).toHaveLength(1)
    expect(iconCalls[0]).toEqual(expect.objectContaining({ source: 'sword', size: 16, color: 'rgba(255,255,255,0.85)' }))
  })

  it('keeps seat 1 bottom and seat 2 top in faceToFace regardless of p1OnRight', () => {
    const { rerender } = render(<CornerStatusBadges orientationMode='faceToFace' p1OnRight p1={{}} p2={{}} />)
    let [p1Call, p2Call] = cornerViewCalls()
    expect(cornerStyles(p1Call)).toEqual(expect.arrayContaining([expect.objectContaining({ bottom: 12, left: 12 })]))
    expect(cornerStyles(p2Call)).toEqual(expect.arrayContaining([expect.objectContaining({ top: 12, right: 12 })]))

    mockViewRender.mockClear()
    rerender(<CornerStatusBadges orientationMode='faceToFace' p1OnRight={false} p1={{}} p2={{}} />)
    ;[p1Call, p2Call] = cornerViewCalls()
    expect(cornerStyles(p1Call)).toEqual(expect.arrayContaining([expect.objectContaining({ bottom: 12, left: 12 })]))
    expect(cornerStyles(p2Call)).toEqual(expect.arrayContaining([expect.objectContaining({ top: 12, right: 12 })]))
  })

  it('moves both badges to the right side in sideBySide when p1OnRight is true', () => {
    render(<CornerStatusBadges orientationMode='sideBySide' p1OnRight p1={{}} p2={{}} />)
    const [p1Call, p2Call] = cornerViewCalls()
    expect(cornerStyles(p1Call)).toEqual(expect.arrayContaining([expect.objectContaining({ bottom: 12, right: 12 })]))
    expect(cornerStyles(p2Call)).toEqual(expect.arrayContaining([expect.objectContaining({ top: 12, right: 12 })]))
  })

  it('moves both badges to the left side in sideBySide when p1OnRight is false', () => {
    render(<CornerStatusBadges orientationMode='sideBySide' p1OnRight={false} p1={{}} p2={{}} />)
    const [p1Call, p2Call] = cornerViewCalls()
    expect(cornerStyles(p1Call)).toEqual(expect.arrayContaining([expect.objectContaining({ bottom: 12, left: 12 })]))
    expect(cornerStyles(p2Call)).toEqual(expect.arrayContaining([expect.objectContaining({ top: 12, left: 12 })]))
  })
})
