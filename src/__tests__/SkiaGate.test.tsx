import { act, render } from '@testing-library/react'

import { SkiaGate } from '../SkiaGate'

function Loaded({ label }: { label: string }) {
  return <span>{label}</span>
}

describe('SkiaGate', () => {
  it('renders the fallback (default null) until getComponent resolves, then renders the real component with componentProps', async () => {
    let resolveImport!: (mod: { default: typeof Loaded }) => void
    const getComponent = jest.fn(() => new Promise<{ default: typeof Loaded }>((resolve) => (resolveImport = resolve)))

    const { container } = render(<SkiaGate getComponent={getComponent} componentProps={{ label: 'hi' }} />)

    // Nothing has resolved yet — the default fallback (null) is what's on screen.
    expect(container.textContent).toBe('')
    expect(getComponent).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveImport({ default: Loaded })
    })

    expect(container.textContent).toBe('hi')
  })

  it('renders a custom fallback while pending', () => {
    const getComponent = jest.fn(() => new Promise<{ default: typeof Loaded }>(() => {})) // never resolves

    const { container } = render(<SkiaGate getComponent={getComponent} componentProps={{ label: 'hi' }} fallback={<span>loading</span>} />)

    expect(container.textContent).toBe('loading')
  })

  it('does not setState after unmount, once getComponent resolves', async () => {
    let resolveImport!: (mod: { default: typeof Loaded }) => void
    const getComponent = jest.fn(() => new Promise<{ default: typeof Loaded }>((resolve) => (resolveImport = resolve)))

    const { unmount } = render(<SkiaGate getComponent={getComponent} componentProps={{ label: 'hi' }} />)
    unmount()

    // Resolving after unmount must not throw React's "state update on an unmounted component"
    // warning-turned-error — the effect's cleanup flips a `cancelled` flag the resolved .then()
    // checks before calling setState.
    await expect(
      act(async () => {
        resolveImport({ default: Loaded })
      })
    ).resolves.not.toThrow()
  })

  it('re-fetches when the getComponent prop identity changes', async () => {
    const first = jest.fn(() => Promise.resolve({ default: Loaded }))
    const second = jest.fn(() => Promise.resolve({ default: Loaded }))

    const { rerender } = render(<SkiaGate getComponent={first} componentProps={{ label: 'a' }} />)
    await act(async () => {})
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()

    rerender(<SkiaGate getComponent={second} componentProps={{ label: 'b' }} />)
    await act(async () => {})
    expect(second).toHaveBeenCalledTimes(1)
  })
})
