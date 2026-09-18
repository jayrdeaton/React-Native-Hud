import { render } from '@testing-library/react'
import { Text } from 'react-native-paper'

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

  it('stringifies zero values rather than rendering an empty value', () => {
    render(<ActivityStatSection stats={{ distinctDaysPlayed: 0, currentDayStreak: 0, bestDayStreak: 0 }} />)

    const rendered = (Text as jest.Mock).mock.calls.map((c) => c[0].children)
    expect(rendered.filter((c) => c === '0')).toHaveLength(3)
  })
})
