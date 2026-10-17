import { render } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { ActivityStatSection } from '../ActivityStatSection'

// See StatSection.test.tsx's own header comment for why this inspects the Text mock directly
// rather than screen.getByText.
describe('ActivityStatSection', () => {
  it('renders the ACTIVITY section label and its three rows', () => {
    render(<ActivityStatSection stats={{ distinctDaysPlayed: 5, currentDayStreak: 2, bestDayStreak: 7 }} />)

    const rendered = (Text as jest.Mock).mock.calls.map((c) => c[0].children)
    expect(rendered).toContain('ACTIVITY')
    expect(rendered).toContain('Days Played')
    expect(rendered).toContain('Day Streak')
    expect(rendered).toContain('Best Day Streak')
    expect(rendered).toContain('5')
    expect(rendered).toContain('2')
    expect(rendered).toContain('7')
  })

  it('passes fg/fgMuted/sectionBg through to the section and its rows', () => {
    render(<ActivityStatSection stats={{ distinctDaysPlayed: 5, currentDayStreak: 2, bestDayStreak: 7 }} fg='#111111' fgMuted='#222222' sectionBg='#333333' />)

    const styles = (style: unknown) => [style].flat(Infinity) as ({ color?: string; backgroundColor?: string } | undefined)[]
    const colorOf = (children: string) => styles((Text as jest.Mock).mock.calls.find((c) => c[0].children === children)![0].style).find((s) => s?.color)?.color
    expect(colorOf('ACTIVITY')).toBe('#111111')
    expect(colorOf('5')).toBe('#111111')
    expect(colorOf('Days Played')).toBe('#222222')
    expect(mockViewRender.mock.calls.some(([props]) => styles(props.style).some((s) => s?.backgroundColor === '#333333'))).toBe(true)
  })

  it('stringifies zero values rather than rendering an empty value', () => {
    render(<ActivityStatSection stats={{ distinctDaysPlayed: 0, currentDayStreak: 0, bestDayStreak: 0 }} />)

    const rendered = (Text as jest.Mock).mock.calls.map((c) => c[0].children)
    expect(rendered.filter((c) => c === '0')).toHaveLength(3)
  })
})
