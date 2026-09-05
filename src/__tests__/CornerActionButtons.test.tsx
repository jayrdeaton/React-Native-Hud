import { IconButton } from '@rific/feedback-press'
import { render } from '@testing-library/react'

import { CornerActionButtons } from '../CornerActionButtons'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

describe('CornerActionButtons', () => {
  it('renders exactly a back button and a settings button', () => {
    render(<CornerActionButtons onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' insets={{ top: 0, left: 0, right: 0 }} />)

    const calls = (IconButton as jest.Mock).mock.calls.map((c) => c[0])
    expect(calls).toHaveLength(2)
    expect(calls.map((p) => p.icon)).toEqual(['arrow-left', 'cog'])
  })

  it('positions the back button at 8px past the top/left insets', () => {
    render(<CornerActionButtons onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' insets={{ top: 20, left: 10, right: 30 }} />)

    const back = (IconButton as jest.Mock).mock.calls[0][0]
    const entries = flatten(back.style)
    expect(entries.some((e) => e.position === 'absolute')).toBe(true)
    expect(entries.find((e) => 'top' in e)).toEqual(expect.objectContaining({ top: 28 }))
    expect(entries.find((e) => 'left' in e)).toEqual(expect.objectContaining({ left: 18 }))
  })

  it('positions the settings button at 8px past the top/right insets', () => {
    render(<CornerActionButtons onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' insets={{ top: 20, left: 10, right: 30 }} />)

    const settings = (IconButton as jest.Mock).mock.calls[1][0]
    const entries = flatten(settings.style)
    expect(entries.some((e) => e.position === 'absolute')).toBe(true)
    expect(entries.find((e) => 'top' in e)).toEqual(expect.objectContaining({ top: 28 }))
    expect(entries.find((e) => 'right' in e)).toEqual(expect.objectContaining({ right: 38 }))
  })

  it('invokes onBack/onSettings exactly once each when their captured onPress fires', () => {
    const onBack = jest.fn()
    const onSettings = jest.fn()
    render(<CornerActionButtons onBack={onBack} onSettings={onSettings} fg='#ffffff' insets={{ top: 0, left: 0, right: 0 }} />)

    const [back, settings] = (IconButton as jest.Mock).mock.calls.map((c) => c[0])
    back.onPress()
    settings.onPress()

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onSettings).toHaveBeenCalledTimes(1)
  })

  it('labels the settings button for accessibility, and the back button too', () => {
    render(<CornerActionButtons onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' insets={{ top: 0, left: 0, right: 0 }} />)

    const [back, settings] = (IconButton as jest.Mock).mock.calls.map((c) => c[0])
    expect(back.accessibilityLabel).toBe('Back')
    expect(settings.accessibilityLabel).toBe('Settings')
  })

  it('overrides the back button icon and label when provided, leaving settings untouched', () => {
    render(<CornerActionButtons onBack={jest.fn()} onSettings={jest.fn()} fg='#ffffff' insets={{ top: 0, left: 0, right: 0 }} backIcon='home' backLabel='Home' />)

    const [back, settings] = (IconButton as jest.Mock).mock.calls.map((c) => c[0])
    expect(back.icon).toBe('home')
    expect(back.accessibilityLabel).toBe('Home')
    expect(settings.icon).toBe('cog')
    expect(settings.accessibilityLabel).toBe('Settings')
  })
})
