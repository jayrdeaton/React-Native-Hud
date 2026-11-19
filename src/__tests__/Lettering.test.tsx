import { render } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { AchievementCatalogSection } from '../AchievementCatalogSection'
import { BaseStatsScreen } from '../BaseStatsScreen'
import { LetteringProvider } from '../Lettering'
import { StatSection } from '../StatSection'

const TITLE = { fontFamily: 'AlphaSketch', textTransform: 'uppercase' } as const
const LABEL = { fontFamily: 'AlphaSketch', fontWeight: 'normal' } as const
const INSETS = { top: 0, left: 0, bottom: 0, right: 0 }

// Each rendered Text's style, flattened, by its text (the package's Text mock, as StatSection.test.tsx reads it).
const styleOf = (text: string): Record<string, unknown>[] => {
  const call = (Text as jest.Mock).mock.calls.find((c) => c[0].children === text)
  return ([] as unknown[])
    .concat(call?.[0].style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]
}

beforeEach(() => (Text as jest.Mock).mockClear())

// A game's own lettering (AlphaTastic's title font, 2026-11-19), laid over the fleet's titles and labels.
describe('LetteringProvider', () => {
  it("letters the stats screen's title, and its sections' headings and captions", () => {
    render(
      <LetteringProvider title={TITLE} label={LABEL}>
        <BaseStatsScreen title='Stats' onBack={jest.fn()} insets={INSETS}>
          <StatSection label='PROGRESS' caption='PLAYED'>
            <Text>row</Text>
          </StatSection>
          <AchievementCatalogSection rows={[]} />
        </BaseStatsScreen>
      </LetteringProvider>
    )

    expect(styleOf('Stats')).toContainEqual(TITLE)
    expect(styleOf('PROGRESS')).toContainEqual(LABEL)
    expect(styleOf('PLAYED')).toContainEqual(LABEL)
    expect(styleOf('ALL ACHIEVEMENTS')).toContainEqual(LABEL)
    expect(styleOf('row')).not.toContainEqual(LABEL)
  })

  it('changes nothing without it', () => {
    render(
      <StatSection label='PROGRESS'>
        <Text>row</Text>
      </StatSection>
    )

    expect(styleOf('PROGRESS')).not.toContainEqual(LABEL)
  })
})
