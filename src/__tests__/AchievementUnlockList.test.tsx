import type { AchievementTier } from '@tastic/achievements'
import { ProfileChip } from '@tastic/profile'
import { render } from '@testing-library/react'
import { Icon, Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { AchievementUnlockList, type UnlockedAchievement } from '../AchievementUnlockList'

// See StatRow.test.tsx's own header comment for why this inspects the Text mock directly rather
// than screen.getByText.
function renderedTexts() {
  return (Text as jest.Mock).mock.calls.map((c) => c[0].children)
}

// Same flatten/viewStyles pattern as PopoverBody.test.tsx's own header comment.
const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]
const backgroundColors = () => (mockViewRender as jest.Mock).mock.calls.flatMap((call) => flatten((call[0] as { style?: unknown }).style).map((s) => s.backgroundColor)).filter(Boolean)

const tierColors: Record<AchievementTier, string> = { bronze: '#0000b1', silver: '#0000b2', gold: '#0000b3' }
const firstWin: UnlockedAchievement = { id: 'first-win', icon: 'trophy', title: 'First Win', tier: 'bronze' }
const tenWins: UnlockedAchievement = { id: 'ten-wins', icon: 'medal', title: 'Ten Wins', tier: 'gold' }
const profile = { id: 'p1', name: 'Jay', color: '#123456', tag: 'J', createdAt: 0, updatedAt: 0 }
const owners = { 1: { profile, color: '#123456' }, 2: { profile: null, color: '#654321' } }

beforeEach(() => jest.clearAllMocks())

describe('AchievementUnlockList', () => {
  it('renders nothing when no seat unlocked anything', () => {
    const { container } = render(<AchievementUnlockList unlocks={{ 1: [], 2: [] }} seats={[1, 2]} owners={owners} tierColors={tierColors} />)

    expect(container.innerHTML).toBe('')
    expect(Text).not.toHaveBeenCalled()
  })

  it('renders one row per achievement, in seat order', () => {
    render(<AchievementUnlockList unlocks={{ 2: [tenWins], 1: [firstWin] }} seats={[1, 2]} owners={owners} tierColors={tierColors} />)

    expect(renderedTexts()).toEqual(['First Win', 'Ten Wins'])
  })

  it('shows the seat profile as a ProfileChip, and a color avatar for a guest seat', () => {
    render(<AchievementUnlockList unlocks={{ 1: [firstWin], 2: [tenWins] }} seats={[1, 2]} owners={owners} tierColors={tierColors} />)

    expect((ProfileChip as unknown as jest.Mock).mock.calls.map((c) => c[0].profile)).toEqual([profile])
    expect((Icon as jest.Mock).mock.calls.map((c) => c[0].source)).toContain('account')
    expect(backgroundColors()).toContain('#654321')
  })

  it('colors each badge by the achievement tier', () => {
    render(<AchievementUnlockList unlocks={{ 1: [firstWin, tenWins] }} seats={[1, 2]} owners={owners} tierColors={tierColors} />)

    const badgeIcons = (Icon as jest.Mock).mock.calls.map((c) => c[0].source)
    expect(badgeIcons).toEqual(['trophy', 'medal'])
    // Seat 1 has a profile, so its avatar is the (mocked) ProfileChip: only the badges paint here.
    expect(backgroundColors()).toEqual(['#0000b1', '#0000b3'])
  })
})
