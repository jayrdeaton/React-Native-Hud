import { BlurView, useBlur } from '@rific/auto-paper'
import { Button } from '@rific/feedback-press'
import { act, render } from '@testing-library/react'
import { type LayoutChangeEvent } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { ConfirmDialog } from '../ConfirmDialog'
import { DialogHeader } from '../DialogHeader'
import { overlayStyles } from '../overlayCard'

// The real header, wrapped so a test can read the props it was rendered with.
jest.mock('../DialogHeader', () => {
  const actual = jest.requireActual('../DialogHeader')
  return { ...actual, DialogHeader: jest.fn(actual.DialogHeader) }
})

function lastHeaderProps() {
  return (DialogHeader as unknown as jest.Mock).mock.lastCall![0]
}

const baseProps = {
  visible: true,
  title: 'Start a new game?',
  message: 'This game is still in progress - starting a new one will count it as a loss.',
  confirmLabel: 'New Game',
  cancelLabel: 'Cancel',
  onConfirm: jest.fn(),
  onCancel: jest.fn()
}

// Button is a bare stub (see rific-feedback-press mock) that renders its own `children` - since
// both buttons here are passed a plain string label, the label text itself is what distinguishes
// the two rendered calls, same technique BaseSettingsDialog.test.tsx uses for TouchableRipple via
// accessibilityLabel.
function findButtonByLabel(label: string) {
  const call = (Button as jest.Mock).mock.calls.find(([props]) => props.children === label)
  if (!call) throw new Error(`No Button rendered with label "${label}"`)
  return call[0]
}

describe('ConfirmDialog', () => {
  it('renders nothing while not visible', () => {
    const { container, unmount } = render(<ConfirmDialog {...baseProps} visible={false} />)
    expect(container.textContent).toBe('')
    unmount()
  })

  it('renders the title and message while visible', () => {
    const { container, unmount } = render(<ConfirmDialog {...baseProps} />)
    expect(container.textContent).toContain('Start a new game?')
    expect(container.textContent).toContain('This game is still in progress - starting a new one will count it as a loss.')
    unmount()
  })

  it('invokes onConfirm/onCancel exactly once each when their captured onPress fires', () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    const { unmount } = render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />)

    findButtonByLabel('New Game').onPress()
    findButtonByLabel('Cancel').onPress()

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('colors the confirm button with the primary role by default, and the danger role when destructive', () => {
    const { unmount: unmountDefault } = render(<ConfirmDialog {...baseProps} />)
    expect(findButtonByLabel('New Game').buttonColor).toBe('#000004') // colors.primary (see the mock)
    unmountDefault()
    ;(Button as jest.Mock).mockClear()

    const { unmount: unmountDestructive } = render(<ConfirmDialog {...baseProps} destructive />)
    expect(findButtonByLabel('New Game').buttonColor).toBe('#00000b') // colors.danger (see the mock)
    unmountDestructive()
  })

  it('defaults the icon to a question mark, and accepts an override', () => {
    const { unmount: unmountDefault } = render(<ConfirmDialog {...baseProps} />)
    expect((Icon as jest.Mock).mock.calls[0][0].source).toBe('help-circle-outline')
    unmountDefault()
    ;(Icon as jest.Mock).mockClear()

    const { unmount: unmountOverride } = render(<ConfirmDialog {...baseProps} icon='alert-circle-outline' />)
    expect((Icon as jest.Mock).mock.calls[0][0].source).toBe('alert-circle-outline')
    unmountOverride()
  })

  // The 0.16.0 card was a plain View in fixed black/white over a 72% black scrim; these pin the
  // theme-following, blur-aware one (OverlaySurface.tsx) so a revert fails here.
  it("draws the theme's raised, blur-aware card over the theme's backdrop", () => {
    const { unmount } = render(<ConfirmDialog {...baseProps} />)

    const blurCalls = (BlurView as unknown as jest.Mock).mock.calls
    expect(blurCalls[blurCalls.length - 1][0]).toMatchObject({ blur: true })
    expect(blurCalls[blurCalls.length - 1][0].elevation).toBeUndefined()
    const bodyCalls = (Text as jest.Mock).mock.calls.filter(([props]) => props.variant === 'bodyLarge')
    expect([bodyCalls[bodyCalls.length - 1][0].style].flat(Infinity)).toContainEqual({ color: '#000002' }) // colors.onSurface
    const backdrop = mockViewRender.mock.calls.map(([props]) => [props.style].flat(Infinity)).filter((style) => style.includes(overlayStyles.overlay))
    expect(backdrop[backdrop.length - 1]).toContainEqual({ backgroundColor: '#00000e' }) // colors.backdrop
    unmount()
  })

  it("passes the player's Blur setting through to the card", () => {
    ;(useBlur as jest.Mock).mockImplementationOnce((override?: boolean) => override ?? false)
    const { unmount } = render(<ConfirmDialog {...baseProps} />)

    const blurCalls = (BlurView as unknown as jest.Mock).mock.calls
    expect(blurCalls[blurCalls.length - 1][0]).toMatchObject({ blur: false })
    unmount()
  })

  it("opens with the fleet's dialog header: the icon and title in the accent, the danger role when destructive", () => {
    const { unmount } = render(<ConfirmDialog {...baseProps} destructive />)

    expect(lastHeaderProps()).toEqual(expect.objectContaining({ icon: 'help-circle-outline', title: 'Start a new game?', color: '#00000b', compact: false }))
    unmount()
  })

  it('uses the compact header once its backdrop measures short (a phone held sideways)', () => {
    const { unmount } = render(<ConfirmDialog {...baseProps} />)
    const backdrop = mockViewRender.mock.calls.filter(([props]) => [props.style].flat(Infinity).includes(overlayStyles.overlay)).pop()![0]

    act(() => (backdrop.onLayout as (e: LayoutChangeEvent) => void)({ nativeEvent: { layout: { x: 0, y: 0, width: 874, height: 402 } } } as LayoutChangeEvent))
    expect(lastHeaderProps()).toEqual(expect.objectContaining({ compact: true }))
    unmount()
  })
})
