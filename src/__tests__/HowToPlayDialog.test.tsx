import { Button } from '@rific/feedback-press'
import { act, render } from '@testing-library/react'
import { ScrollView } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

import { mockBackHandlerAdd, mockBackHandlerRemove, mockScrollTo, mockViewRender } from '../__mocks__/react-native'
import { getGuideCardSize, HowToPlayDialog } from '../guide/HowToPlayDialog'
import type { GuideStep } from '../guide/types'

const steps: GuideStep[] = [
  { title: 'Swipe to steer', body: 'Swipe in any direction.' },
  { title: 'Avoid every trail', body: 'Last cycle riding wins.', art: <>ART TWO</> },
  { title: 'Two players, one phone', body: 'Sit across from each other.' }
]

const baseProps = { visible: true, steps, onFinish: jest.fn(), onSkip: jest.fn() }

// Button is a bare stub (see rific-feedback-press mock) that renders its own `children`, so the label
// itself identifies which button a captured onPress belongs to — same technique ConfirmDialog.test.tsx
// uses. Always takes the MOST RECENT render's props: a button's onPress closes over the page index it
// rendered with, so after a state change the earlier calls hold stale closures.
function findButton(label: string) {
  const matches = (Button as jest.Mock).mock.calls.filter(([props]) => props.children === label)
  if (matches.length === 0) throw new Error(`No Button rendered with label "${label}"`)
  return matches[matches.length - 1][0]
}

// Whether a button is CURRENTLY on screen — read from the rendered text, not the captured calls: the
// Button mock's call list accumulates across every re-render within a test, so a button that has
// since disappeared (Skip, once on the last card) would still be "found" there.
function has(container: HTMLElement, label: string) {
  return (container.textContent ?? '').includes(label)
}

// The dots row carries its own accessibilityLabel ("Step 2 of 3") — the View mock renders only its
// children (no DOM element), so the label is only observable through the captured props.
function currentStepLabel() {
  const labels = mockViewRender.mock.calls.map(([props]) => props.accessibilityLabel as string | undefined).filter((label): label is string => !!label?.startsWith('Step '))
  return labels[labels.length - 1]
}

// The paging ScrollView's own props from its latest render (the horizontal one: each page is a
// vertical ScrollView of its own) — onMomentumScrollEnd is what syncs the page index after a swipe.
type ScrollHandler = (e: { nativeEvent: { contentOffset: { x: number } } }) => void
function scrollViewProps() {
  const calls = (ScrollView as jest.Mock).mock.calls.filter(([props]) => props.horizontal)
  return calls[calls.length - 1][0] as { onScroll: ScrollHandler; onMomentumScrollEnd: ScrollHandler }
}

// A scroll event at page `page` (306 = the mocked window's page width).
const at = (page: number) => ({ nativeEvent: { contentOffset: { x: page * 306 } } })

function press(label: string) {
  act(() => {
    findButton(label).onPress()
  })
}

describe('HowToPlayDialog', () => {
  it('renders nothing while not visible', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} visible={false} />)
    expect(container.textContent).toBe('')
    unmount()
  })

  it('renders nothing when there are no steps', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} steps={[]} />)
    expect(container.textContent).toBe('')
    unmount()
  })

  it("renders every step's title, body and art", () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} />)

    for (const step of steps) {
      expect(container.textContent).toContain(step.title)
      expect(container.textContent).toContain(step.body)
    }
    expect(container.textContent).toContain('ART TWO')
    unmount()
  })

  it('starts on the first card: Next and Skip are shown, Back is not', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} />)

    expect(currentStepLabel()).toBe('Step 1 of 3')
    expect(has(container, 'Next')).toBe(true)
    expect(has(container, 'Skip')).toBe(true)
    expect(has(container, 'Back')).toBe(false)
    unmount()
  })

  it('Next advances one card, scrolls the pager to it, and swaps Skip for Back', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} />)

    press('Next')

    expect(currentStepLabel()).toBe('Step 2 of 3')
    // 402 (mocked window width) - 2 * 24 gutter = 354 card width, minus 2 * 24 padding = 306 per page.
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 306, animated: true })
    // One secondary slot: Skip on the first card only, Back everywhere after it.
    expect(has(container, 'Back')).toBe(true)
    expect(has(container, 'Skip')).toBe(false)
    unmount()
  })

  it('Back returns to the previous card, and gives the slot back to Skip on the first', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} />)

    press('Next')
    press('Back')

    expect(currentStepLabel()).toBe('Step 1 of 3')
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 0, animated: true })
    expect(has(container, 'Back')).toBe(false)
    expect(has(container, 'Skip')).toBe(true)
    unmount()
  })

  it('skips the scroll animation under reduced motion', () => {
    ;(useReducedMotion as jest.Mock).mockReturnValueOnce(true)
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    press('Next')

    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 306, animated: false })
    unmount()
  })

  it('follows a swipe: the page index comes from where the scroll came to rest', () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    act(() => scrollViewProps().onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 612 } } }))

    expect(currentStepLabel()).toBe('Step 3 of 3')
    unmount()
  })

  it('follows a plain scroll too: web never fires momentum events, so a swipe must update the dots and buttons', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} />)

    act(() => scrollViewProps().onScroll(at(1)))

    expect(currentStepLabel()).toBe('Step 2 of 3')
    expect(has(container, 'Back')).toBe(true)
    expect(has(container, 'Skip')).toBe(false)
    act(() => scrollViewProps().onScroll(at(2)))
    expect(has(container, 'Ready')).toBe(true)
    unmount()
  })

  it("doesn't flicker back to the page being left while a Next tap animates", () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    press('Next')
    // Offsets the animation passes through on its way from page 1 to page 2.
    act(() => scrollViewProps().onScroll({ nativeEvent: { contentOffset: { x: 40 } } }))
    expect(currentStepLabel()).toBe('Step 2 of 3')
    act(() => scrollViewProps().onScroll(at(1)))
    // Arrived: a swipe after that is followed again.
    act(() => scrollViewProps().onScroll(at(0)))
    expect(currentStepLabel()).toBe('Step 1 of 3')
    unmount()
  })

  it('a settle event clears an interrupted animation, so the next swipe is followed', () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    press('Next')
    // The player grabbed the pager mid-animation and let it settle back on page 1.
    act(() => scrollViewProps().onMomentumScrollEnd(at(0)))
    expect(currentStepLabel()).toBe('Step 1 of 3')
    act(() => scrollViewProps().onScroll(at(2)))
    expect(currentStepLabel()).toBe('Step 3 of 3')
    unmount()
  })

  it('ignores a scroll offset that lands outside the steps', () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    act(() => scrollViewProps().onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: -400 } } }))
    act(() => scrollViewProps().onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 99999 } } }))

    expect(currentStepLabel()).toBe('Step 1 of 3')
    unmount()
  })

  it('on the last card the primary button finishes, Back stays, and Skip and Next are gone', () => {
    const onFinish = jest.fn()
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} onFinish={onFinish} />)

    press('Next')
    press('Next')

    expect(has(container, 'Skip')).toBe(false)
    expect(has(container, 'Next')).toBe(false)
    expect(has(container, 'Back')).toBe(true)
    expect(has(container, 'Ready')).toBe(true)
    expect(onFinish).not.toHaveBeenCalled()
    press('Ready')
    expect(onFinish).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('a single-step guide has no dots, no Skip, and no Back — just the finish button', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} steps={[steps[0]]} />)

    expect(currentStepLabel()).toBeUndefined()
    expect(has(container, 'Skip')).toBe(false)
    expect(has(container, 'Back')).toBe(false)
    expect(has(container, 'Ready')).toBe(true)
    unmount()
  })

  it("matches ConfirmDialog's buttons: an outlined secondary and a primary-colored contained action", () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    expect(findButton('Skip').mode).toBe('outlined')
    const next = findButton('Next')
    expect(next.mode).toBe('contained')
    expect(next.buttonColor).toBe('#000004') // colors.primary (see the mock)
    expect(next.textColor).toBe('#000001') // colors.onPrimary
    press('Next')
    expect(findButton('Back').mode).toBe('outlined')
    unmount()
  })

  it('defaults the finish button to a single word', () => {
    const { container, unmount } = render(<HowToPlayDialog {...baseProps} steps={[steps[0]]} />)

    expect(has(container, 'Ready')).toBe(true)
    unmount()
  })

  it('Skip calls onSkip', () => {
    const onSkip = jest.fn()
    const { unmount } = render(<HowToPlayDialog {...baseProps} onSkip={onSkip} />)

    press('Skip')

    expect(onSkip).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("Android's hardware back button counts as Skip, and the listener is removed on close", () => {
    const onSkip = jest.fn()
    const { unmount } = render(<HowToPlayDialog {...baseProps} onSkip={onSkip} />)

    const handler = mockBackHandlerAdd.mock.calls[0][1]
    // Returns true so the press is consumed instead of falling through to the router underneath.
    expect(handler()).toBe(true)
    expect(onSkip).toHaveBeenCalledTimes(1)

    unmount()
    expect(mockBackHandlerRemove).toHaveBeenCalledTimes(1)
  })

  it('restarts on the first card every time it reopens', () => {
    const { rerender, unmount } = render(<HowToPlayDialog {...baseProps} />)
    press('Next')
    expect(currentStepLabel()).toBe('Step 2 of 3')

    rerender(<HowToPlayDialog {...baseProps} visible={false} />)
    rerender(<HowToPlayDialog {...baseProps} visible />)

    expect(currentStepLabel()).toBe('Step 1 of 3')
    unmount()
  })

  it('rotates the card itself for the fake-landscape rotation, and not at all at 0', () => {
    const cardStyle = () => mockViewRender.mock.calls.filter(([props]) => props.accessibilityViewIsModal).pop()![0].style as unknown[]

    const upright = render(<HowToPlayDialog {...baseProps} />)
    expect(cardStyle()).not.toContainEqual(expect.objectContaining({ transform: expect.anything() }))
    upright.unmount()

    const turned = render(<HowToPlayDialog {...baseProps} rotation={-90} />)
    expect(cardStyle()).toContainEqual({ transform: [{ rotate: '-90deg' }] })
    turned.unmount()
  })

  it('pages at the quarter-turned card width when held sideways', () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} rotation={90} />)

    press('Next')

    // 874 (mocked window height, the sideways width) - 2 * 24 = 826, capped at 520, minus 2 * 24 padding.
    expect(mockScrollTo).toHaveBeenLastCalledWith({ x: 472, animated: true })
    unmount()
  })

  it('marks the card as a modal for screen readers', () => {
    const { unmount } = render(<HowToPlayDialog {...baseProps} />)

    expect(mockViewRender.mock.calls.some(([props]) => props.accessibilityViewIsModal === true)).toBe(true)
    unmount()
  })
})

describe('getGuideCardSize', () => {
  it('sizes an upright card to the window, capped at 360 wide, with full art', () => {
    expect(getGuideCardSize(402, 874, 0)).toEqual({ width: 354, pageWidth: 306, maxHeight: 826, artHeight: 132 })
    expect(getGuideCardSize(1200, 900, 180)).toEqual({ width: 360, pageWidth: 312, maxHeight: 852, artHeight: 132 })
  })

  it("sizes a quarter-turned card against the SWAPPED window: its height must fit the phone's short edge", () => {
    // A 360pt-wide Android phone held sideways: the card's layout height becomes its on-screen width.
    const size = getGuideCardSize(360, 800, 90)
    expect(size.maxHeight).toBe(312)
    expect(size.width).toBe(520)
    expect(size.artHeight).toBe(88)
    expect(getGuideCardSize(360, 800, -90)).toEqual(size)
  })

  it('never lets a card run wider than the space it has', () => {
    expect(getGuideCardSize(320, 568, 0).width).toBe(272)
    expect(getGuideCardSize(320, 480, 90).width).toBe(432)
  })
})
