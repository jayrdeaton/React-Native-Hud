import { render } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { mockViewRender } from '../__mocks__/react-native'
import { StatSection } from '../StatSection'

// See StatRow.test.tsx's own header comment for why this inspects the Text mock directly rather
// than screen.getByText — this package's own View/Text mocks leave no per-Text DOM boundary once
// more than one Text renders as siblings.
// Same flatten/viewStyles pattern as PopoverBody.test.tsx's own header comment.
const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]
const viewStyles = (): Record<string, unknown>[][] => (mockViewRender as jest.Mock).mock.calls.map((call) => flatten((call[0] as { style?: unknown }).style))

describe('StatSection', () => {
  it('renders the label and its children', () => {
    render(
      <StatSection label='OVERALL'>
        <Text>child content</Text>
      </StatSection>
    )

    const rendered = (Text as jest.Mock).mock.calls.map((c) => c[0].children)
    expect(rendered).toContain('OVERALL')
    expect(rendered).toContain('child content')
  })

  it('accepts fg/sectionBg overrides in place of the dark-mode-derived defaults', () => {
    render(
      <StatSection label='OVERALL' fg='#222222' sectionBg='#333333'>
        <Text>child content</Text>
      </StatSection>
    )

    const labelProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'OVERALL')![0]
    expect([labelProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#222222')).toBe(true)
    expect(viewStyles().some((entries) => entries.some((e) => e.backgroundColor === '#333333'))).toBe(true)
  })
})
