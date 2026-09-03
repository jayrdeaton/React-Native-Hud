import { Button, IconButton } from '@rific/feedback-press'
import { act, render } from '@testing-library/react'
import { Icon, Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { BaseStatsScreen } from '../BaseStatsScreen'

const INSETS = { top: 0, left: 0, bottom: 0, right: 0 }

// See StatRow.test.tsx's own header comment for why this inspects the Text mock directly rather
// than screen.getByText — this package's own View/Text mocks leave no per-Text DOM boundary once
// more than one Text renders as siblings (title + children content here).
function renderedTexts() {
  return (Text as jest.Mock).mock.calls.map((c) => c[0].children)
}

// Same flatten/viewStyles pattern as PopoverBody.test.tsx's own header comment — every <View>
// rendered anywhere in the tree, as its flattened style-entry list, so a backgroundColor override
// can be asserted without depending on which View call index carries it.
const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]
const viewStyles = (): Record<string, unknown>[][] => (mockViewRender as jest.Mock).mock.calls.map((call) => flatten((call[0] as { style?: unknown }).style))

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

  it('accepts fg/bg/cardBg overrides in place of the dark-mode-derived defaults', () => {
    const onReset = jest.fn()
    render(
      <BaseStatsScreen onBack={jest.fn()} onReset={onReset} insets={INSETS} fg='#123456' bg='#ABCDEF' cardBg='#334455'>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    expect((IconButton as jest.Mock).mock.calls[0][0].iconColor).toBe('#123456')
    const titleProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'Achievements')![0]
    expect([titleProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#123456')).toBe(true)
    expect(viewStyles().some((entries) => entries.some((e) => e.backgroundColor === '#ABCDEF'))).toBe(true)

    const resetTrigger = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset All Stats')![0]
    act(() => resetTrigger.onPress())
    expect(viewStyles().some((entries) => entries.some((e) => e.backgroundColor === '#334455'))).toBe(true)
  })

  it('accepts an accentColor override for the confirm-overlay alert icon/title, in place of colors.secondary', () => {
    render(
      <BaseStatsScreen onBack={jest.fn()} onReset={jest.fn()} insets={INSETS} accentColor='#00CC00'>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    const resetTrigger = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset All Stats')![0]
    act(() => resetTrigger.onPress())

    expect((Icon as jest.Mock).mock.calls[0][0].color).toBe('#00CC00')
    const titleProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset Everything?')![0]
    expect([titleProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#00CC00')).toBe(true)
  })

  it('renders the reset trigger and confirm Reset button as matching, self-contained colors.secondary/onSecondary fills, unaffected by accentColor', () => {
    render(
      <BaseStatsScreen onBack={jest.fn()} onReset={jest.fn()} insets={INSETS} accentColor='#00CC00'>
        <Text>content</Text>
      </BaseStatsScreen>
    )

    // Both are contained buttons with their own opaque fill, so neither depends on being legible
    // against the surrounding bg/cardBg the way a text-only color would — accentColor never reaches
    // either. Also asserted equal to each other: the trigger and the confirm action now render as
    // the same solid-fill button, not the old outlined-vs-contained mismatch.
    const resetTrigger = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset All Stats')![0]
    expect(resetTrigger.buttonColor).not.toBe('#00CC00')

    act(() => resetTrigger.onPress())
    const confirmButton = (Button as jest.Mock).mock.calls.find((c) => c[0].children === 'Reset')![0]
    expect(confirmButton.buttonColor).not.toBe('#00CC00')
    expect(resetTrigger.buttonColor).toBe(confirmButton.buttonColor)
    expect(resetTrigger.textColor).toBe(confirmButton.textColor)
  })
})
