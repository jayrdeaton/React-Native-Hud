import { getBlendedColor, useAutoPaperTheme } from '@rific/auto-paper'
import type { AchievementCatalogRow } from '@tastic/achievements'
import { render } from '@testing-library/react'
import { Icon, ProgressBar, Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { AchievementCatalogSection } from '../AchievementCatalogSection'
import { LOCKED_BADGE_COLOR } from '../AchievementRow'

// See AchievementRow.test.tsx's own header comment for why this inspects the Text mock directly
// rather than screen.getByText.
function renderedTexts() {
  return (Text as jest.Mock).mock.calls.map((c) => c[0].children)
}

// Every <View>'s own backgroundColor, flattened - the badges are the only Views here that set one
// besides each row's own section background.
const viewBackgrounds = () => mockViewRender.mock.calls.flatMap(([props]) => [props.style].flat(Infinity)).map((style) => (style as { backgroundColor?: string } | undefined)?.backgroundColor)
const checkColor = () => (Icon as jest.Mock).mock.calls.find((c) => c[0].source === 'check-circle')![0].color
const progressColor = () => (ProgressBar as jest.Mock).mock.calls[0][0].color

const lockedRow: AchievementCatalogRow = { id: 'first-win', icon: 'trophy', title: 'First Win', description: 'Win a match', tierColor: '#FFD54F', progress: 0.4, deviceMarker: false }
const unlockedRow: AchievementCatalogRow = { id: 'ten-wins', icon: 'trophy', title: 'Ten Wins', description: 'Win ten matches', tierColor: '#4FC3F7', unlockedAt: 1000, unlockedLabel: 'Unlocked today', deviceMarker: true }

describe('AchievementCatalogSection', () => {
  it('renders the default heading and one row per entry', () => {
    render(<AchievementCatalogSection rows={[lockedRow, unlockedRow]} />)

    expect(renderedTexts()).toContain('ALL ACHIEVEMENTS')
    expect(renderedTexts()).toContain('First Win')
    expect(renderedTexts()).toContain('Ten Wins')
  })

  it('accepts a custom label', () => {
    render(<AchievementCatalogSection rows={[]} label='TROPHIES' />)

    expect(renderedTexts()).toContain('TROPHIES')
    expect(renderedTexts()).not.toContain('ALL ACHIEVEMENTS')
  })

  it('resolves badgeColor to LOCKED_BADGE_COLOR while locked and to tierColor once unlocked', () => {
    render(<AchievementCatalogSection rows={[lockedRow, unlockedRow]} />)

    expect(viewBackgrounds()).toContain(LOCKED_BADGE_COLOR)
    expect(viewBackgrounds()).toContain(unlockedRow.tierColor)
    expect(viewBackgrounds()).not.toContain(lockedRow.tierColor)
  })

  describe('check mark and progress bar color', () => {
    const blend = getBlendedColor as jest.Mock
    const theme = useAutoPaperTheme as jest.Mock
    const defaultBlend = blend.getMockImplementation()
    const defaultTheme = theme.getMockImplementation()!

    beforeEach(() => {
      blend.mockImplementation((a: string, b: string, t: number) => `mix(${a},${b},${t})`)
    })
    afterEach(() => {
      blend.mockImplementation(defaultBlend)
      theme.mockImplementation(defaultTheme)
    })

    it('mixes the tier color half with black in light mode, where raw gold and silver barely show', () => {
      render(<AchievementCatalogSection rows={[lockedRow, unlockedRow]} />)

      expect(progressColor()).toBe(`mix(#000000,${lockedRow.tierColor},0.5)`)
      expect(checkColor()).toBe(`mix(#000000,${unlockedRow.tierColor},0.5)`)
      // The badge keeps the true tier color behind its black glyph.
      expect(viewBackgrounds()).toContain(unlockedRow.tierColor)
    })

    it('uses the raw tier color in dark mode', () => {
      theme.mockImplementation(() => ({ ...defaultTheme(), dark: true }))
      render(<AchievementCatalogSection rows={[lockedRow, unlockedRow]} />)

      expect(progressColor()).toBe(lockedRow.tierColor)
      expect(checkColor()).toBe(unlockedRow.tierColor)
      expect(blend).not.toHaveBeenCalled()
    })
  })

  it('passes progress through only for locked rows and deviceMarker per row', () => {
    render(<AchievementCatalogSection rows={[lockedRow, unlockedRow]} />)

    expect((ProgressBar as jest.Mock).mock.calls).toHaveLength(1)
    expect((ProgressBar as jest.Mock).mock.calls[0][0].progress).toBe(0.4)
    expect(renderedTexts()).toContain('Same for every profile')
  })

  it('renders nothing but the heading when rows is empty', () => {
    render(<AchievementCatalogSection rows={[]} />)

    expect(renderedTexts()).toEqual(['ALL ACHIEVEMENTS'])
  })

  it('accepts fg/fgMuted overrides in place of the dark-mode-derived defaults', () => {
    render(<AchievementCatalogSection rows={[unlockedRow]} fg='#111111' fgMuted='#222222' />)

    const headingProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'ALL ACHIEVEMENTS')![0]
    expect([headingProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#222222')).toBe(true)
    const titleProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'Ten Wins')![0]
    expect([titleProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#111111')).toBe(true)
  })

  it('exposes LOCKED_BADGE_COLOR consistently with AchievementRow (sanity check on the shared import)', () => {
    expect(LOCKED_BADGE_COLOR).toBe('rgba(128,128,128,0.3)')
  })
})
