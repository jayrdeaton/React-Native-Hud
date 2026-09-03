import { render } from '@testing-library/react'
import { Icon, ProgressBar, Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { AchievementRow, LOCKED_BADGE_COLOR } from '../AchievementRow'

// See StatRow.test.tsx's own header comment for why this inspects the Text mock directly rather
// than screen.getByText — this package's own View/Text mocks leave no per-Text DOM boundary once
// more than one Text renders as siblings (title + description + status label, here).
function renderedTexts() {
  return (Text as jest.Mock).mock.calls.map((c) => c[0].children)
}

// Same flatten/viewStyles pattern as PopoverBody.test.tsx's own header comment.
const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]
const viewStyles = (): Record<string, unknown>[][] => (mockViewRender as jest.Mock).mock.calls.map((call) => flatten((call[0] as { style?: unknown }).style))

describe('AchievementRow', () => {
  it('shows a lock icon and no unlocked label when locked', () => {
    render(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor={LOCKED_BADGE_COLOR} />)

    expect(renderedTexts()).toContain('First Win')
    const iconSources = (Icon as jest.Mock).mock.calls.map((c) => c[0].source)
    expect(iconSources).toContain('lock-outline')
    expect(iconSources).not.toContain('check-circle')
  })

  it('shows a check-circle and the unlocked label when unlockedLabel is provided', () => {
    render(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor='#FFD54F' unlockedLabel='Unlocked today' />)

    expect(renderedTexts()).toContain('Unlocked today')
    const iconSources = (Icon as jest.Mock).mock.calls.map((c) => c[0].source)
    expect(iconSources).toContain('check-circle')
    expect(iconSources).not.toContain('lock-outline')
  })

  it('renders a progress bar only while locked and a progress value is given', () => {
    const { rerender } = render(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor={LOCKED_BADGE_COLOR} progress={0.4} />)
    expect((ProgressBar as jest.Mock).mock.calls).toHaveLength(1)
    expect((ProgressBar as jest.Mock).mock.calls[0][0].progress).toBe(0.4)

    ;(ProgressBar as jest.Mock).mockClear()
    rerender(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor='#FFD54F' unlockedLabel='Unlocked today' progress={1} />)
    expect((ProgressBar as jest.Mock).mock.calls).toHaveLength(0)
  })

  it('shows the device-scoped marker only when deviceMarker is true', () => {
    const { rerender } = render(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor={LOCKED_BADGE_COLOR} />)
    expect(renderedTexts()).not.toContain('Same for every profile')

    rerender(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor={LOCKED_BADGE_COLOR} deviceMarker />)
    expect(renderedTexts()).toContain('Same for every profile')
  })

  it('uses checkColor for the unlocked check-circle when provided, falling back to badgeColor otherwise', () => {
    const { rerender } = render(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor='#FFD54F' unlockedLabel='Unlocked today' />)
    let checkCall = (Icon as jest.Mock).mock.calls.find((c) => c[0].source === 'check-circle')
    expect(checkCall![0].color).toBe('#FFD54F')

    ;(Icon as jest.Mock).mockClear()
    rerender(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor='#FFD54F' checkColor='#00FF00' unlockedLabel='Unlocked today' />)
    checkCall = (Icon as jest.Mock).mock.calls.find((c) => c[0].source === 'check-circle')
    expect(checkCall![0].color).toBe('#00FF00')
  })

  it('accepts fg/fgMuted/sectionBg overrides in place of the dark-mode-derived defaults', () => {
    render(<AchievementRow icon='trophy' title='First Win' description='Win a match' badgeColor='#FFD54F' unlockedLabel='Unlocked today' fg='#111111' fgMuted='#222222' sectionBg='#333333' />)

    const titleProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'First Win')![0]
    expect([titleProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#111111')).toBe(true)
    const descriptionProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'Win a match')![0]
    expect([descriptionProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#222222')).toBe(true)
    expect(viewStyles().some((entries) => entries.some((e) => e.backgroundColor === '#333333'))).toBe(true)
  })
})
