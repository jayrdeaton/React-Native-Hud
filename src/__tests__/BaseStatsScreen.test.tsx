import { Button, IconButton } from '@rific/feedback-press'
import { act, render } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { BaseStatsScreen } from '../BaseStatsScreen'

const INSETS = { top: 0, left: 0, bottom: 0, right: 0 }

// See StatRow.test.tsx's own header comment for why this inspects the Text mock directly rather
// than screen.getByText — this package's own View/Text mocks leave no per-Text DOM boundary once
// more than one Text renders as siblings (title + children content here).
function renderedTexts() {
  return (Text as jest.Mock).mock.calls.map((c) => c[0].children)
}

describe('BaseStatsScreen', () => {
  it('renders the back button and title, and its children', () => {
    render(
      <BaseStatsScreen onBack={jest.fn()} insets={INSETS}>
        <Text>section content</Text>
      </BaseStatsScreen>
    )

    expect(renderedTexts()).toContain('Achievements')
    expect(renderedTexts()).toContain('section content')
    expect((IconButton as jest.Mock).mock.calls[0][0].icon).toBe('arrow-left')
  })

  it('accepts a custom title', () => {
    render(
      <BaseStatsScreen title='Stats' onBack={jest.fn()} insets={INSETS}>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    expect(renderedTexts()).toContain('Stats')
    expect(renderedTexts()).not.toContain('Achievements')
  })

  it('invokes onBack exactly once when the back button fires', () => {
    const onBack = jest.fn()
    render(
      <BaseStatsScreen onBack={onBack} insets={INSETS}>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    ;(IconButton as jest.Mock).mock.calls[0][0].onPress()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('omits the reset button entirely when onReset is not provided', () => {
    render(
      <BaseStatsScreen onBack={jest.fn()} insets={INSETS}>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    expect((Button as jest.Mock).mock.calls).toHaveLength(0)
  })

  it('opening the reset button shows the confirm dialog, and Reset invokes onReset then closes it', () => {
    const onReset = jest.fn()
    render(
      <BaseStatsScreen onBack={jest.fn()} onReset={onReset} insets={INSETS}>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    const resetTrigger = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset All Stats')![0]
    act(() => resetTrigger.onPress())

    expect(renderedTexts()).toContain('Reset Everything?')

    // Cleared right before the closing action so the check below reflects only THIS render pass
    // — mock.calls accumulates across the whole test otherwise, and the dialog's now-stale
    // "Reset Everything?" call from the open state would still show up in the history.
    ;(Text as jest.Mock).mockClear()
    const confirmButton = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset')![0]
    act(() => confirmButton.onPress())

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(renderedTexts()).not.toContain('Reset Everything?')
  })

  it('Cancel dismisses the confirm dialog without invoking onReset', () => {
    const onReset = jest.fn()
    render(
      <BaseStatsScreen onBack={jest.fn()} onReset={onReset} insets={INSETS}>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    const resetTrigger = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset All Stats')![0]
    act(() => resetTrigger.onPress())

    // See the identical mockClear() comment in the Reset-confirms test above.
    ;(Text as jest.Mock).mockClear()
    const cancelButton = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Cancel')![0]
    act(() => cancelButton.onPress())

    expect(onReset).not.toHaveBeenCalled()
    expect(renderedTexts()).not.toContain('Reset Everything?')
  })

  it('accepts custom reset copy', () => {
    render(
      <BaseStatsScreen onBack={jest.fn()} onReset={jest.fn()} resetLabel='Reset High Scores' resetConfirmTitle='Clear scores?' resetConfirmBody='Cannot be undone.' insets={INSETS}>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    // The reset button's own label is a Button child (Button's mock renders its bare string
    // children directly, never through the Text mock), so this is asserted via Button's own mock
    // calls, not renderedTexts() — see that helper's own header comment.
    const resetTrigger = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset High Scores')![0]
    act(() => resetTrigger.onPress())
    expect(renderedTexts()).toContain('Clear scores?')
    expect(renderedTexts()).toContain('Cannot be undone.')
  })
})
