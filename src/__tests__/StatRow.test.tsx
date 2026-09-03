import { render } from '@testing-library/react'
import { Text } from 'react-native-paper'

import { StatRow } from '../StatRow'

// getByText isn't reliable here: this package's own View/Text mocks render no wrapping DOM
// element, so two sibling Text children merge into one text node with no per-Text boundary to
// query — see SharedActionBand.test.tsx's own single-Text case for why that one gets away with
// getByText and this multi-Text one doesn't. Inspecting the Text mock's own calls directly sidesteps
// that entirely.
describe('StatRow', () => {
  it('renders the label and value as separate Text children', () => {
    render(<StatRow label='Wins' value='42' />)

    const rendered = (Text as jest.Mock).mock.calls.map((c) => c[0].children)
    expect(rendered).toContain('Wins')
    expect(rendered).toContain('42')
  })

  it('colors the value bold and full-contrast, the label muted', () => {
    render(<StatRow label='Wins' value='42' />)

    const labelProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'Wins')![0]
    const valueProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === '42')![0]
    expect([labelProps.style].flat().some((s: Record<string, unknown>) => s?.color === 'rgba(0,0,0,0.5)')).toBe(true)
    expect([valueProps.style].flat().some((s: Record<string, unknown>) => s?.fontWeight === 'bold')).toBe(true)
  })

  it('accepts fg/fgMuted overrides in place of the dark-mode-derived defaults', () => {
    render(<StatRow label='Wins' value='42' fg='#111111' fgMuted='#222222' />)

    const labelProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === 'Wins')![0]
    const valueProps = (Text as jest.Mock).mock.calls.find((c) => c[0].children === '42')![0]
    expect([labelProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#222222')).toBe(true)
    expect([valueProps.style].flat().some((s: Record<string, unknown>) => s?.color === '#111111')).toBe(true)
  })
})
