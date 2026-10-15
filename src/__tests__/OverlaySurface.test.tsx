import { BlurView, useAutoPaperTheme, useBlur } from '@rific/auto-paper'
import { render } from '@testing-library/react'

import { mockViewRender } from '../__mocks__/react-native'
import { overlayStyles } from '../overlayCard'
import { OverlayBackdrop, OverlayCard, useOverlayCardColors } from '../OverlaySurface'

// The View mock renders only its children (no DOM element), so a View's style is only observable
// through its captured props. Flattened: each component nests the caller's style array in its own.
function lastStyleOf(match: (props: Record<string, unknown>) => boolean) {
  const calls = mockViewRender.mock.calls.filter(([props]) => match(props))
  if (calls.length === 0) throw new Error('No matching View rendered')
  return [calls[calls.length - 1][0].style].flat(Infinity)
}

const backdropStyle = { zIndex: 7 }
const cardStyle = { padding: 24 }

function ColorsProbe({ onColors }: { onColors: (colors: ReturnType<typeof useOverlayCardColors>) => void }) {
  onColors(useOverlayCardColors())
  return null
}

describe('useOverlayCardColors', () => {
  it("takes the card's text, edge and scrim colors from the app's theme", () => {
    const onColors = jest.fn()
    const { unmount } = render(<ColorsProbe onColors={onColors} />)

    expect(onColors).toHaveBeenLastCalledWith({ fg: '#000002', fgMuted: '#000003', cardBorder: '#00000d', backdrop: '#00000e' })
    unmount()
  })

  it('follows the theme when it changes (dark mode, a new palette)', () => {
    const theme = (useAutoPaperTheme as jest.Mock).getMockImplementation()!()
    ;(useAutoPaperTheme as jest.Mock).mockReturnValueOnce({ ...theme, dark: true, colors: { ...theme.colors, onSurface: '#fffff1', backdrop: '#fffff2' } })
    const onColors = jest.fn()
    const { unmount } = render(<ColorsProbe onColors={onColors} />)

    expect(onColors).toHaveBeenLastCalledWith(expect.objectContaining({ fg: '#fffff1', backdrop: '#fffff2' }))
    unmount()
  })
})

describe('OverlayBackdrop', () => {
  it("paints the shared overlay geometry in the theme's backdrop color, then the caller's style", () => {
    const { container, unmount } = render(
      <OverlayBackdrop style={backdropStyle}>
        <>behind the card</>
      </OverlayBackdrop>
    )

    expect(container.textContent).toBe('behind the card')
    expect(lastStyleOf((props) => [props.style].flat(Infinity).includes(overlayStyles.overlay))).toEqual([overlayStyles.overlay, { backgroundColor: '#00000e' }, backdropStyle])
    unmount()
  })
})

describe('OverlayCard', () => {
  it("renders on auto-paper's BlurView at elevation 3 with the theme's edge color", () => {
    const { container, unmount } = render(
      <OverlayCard style={cardStyle} accessibilityViewIsModal testID='card'>
        <>card body</>
      </OverlayCard>
    )

    expect(container.textContent).toBe('card body')
    const calls = (BlurView as unknown as jest.Mock).mock.calls
    const props = calls[calls.length - 1][0]
    expect(props).toMatchObject({ blur: true, elevation: 3, accessibilityViewIsModal: true, testID: 'card' })
    expect([props.style].flat(Infinity)).toEqual([overlayStyles.card, { overflow: 'hidden' }, { borderColor: '#00000d' }, cardStyle])
    unmount()
  })

  // BlurView only follows its own `blur` prop (on by default), so without this the Settings toggle
  // would never reach the card.
  it("follows the player's Blur setting, falling back to the raised surface when it's off", () => {
    // An implementation, not a return value: like real auto-paper, an override still wins, so a card
    // that forced useBlur(true) would fail here.
    ;(useBlur as jest.Mock).mockImplementationOnce((override?: boolean) => override ?? false)
    const { unmount } = render(<OverlayCard />)

    const calls = (BlurView as unknown as jest.Mock).mock.calls
    expect(calls[calls.length - 1][0]).toMatchObject({ blur: false, elevation: 3 })
    unmount()
  })

  it('clips its contents to the rounded corners so a native blur stays inside them', () => {
    const { unmount } = render(<OverlayCard testID='clipped' />)

    expect(lastStyleOf((props) => props.testID === 'clipped')).toContainEqual({ overflow: 'hidden' })
    unmount()
  })
})
