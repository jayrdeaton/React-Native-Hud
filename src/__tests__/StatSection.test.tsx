import { render } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { StatSection } from '../StatSection'

// See StatRow.test.tsx's own header comment for why this inspects the Text mock directly rather
// than screen.getByText — this package's own View/Text mocks leave no per-Text DOM boundary once
// more than one Text renders as siblings.
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
})
