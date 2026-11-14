import { act, render, screen } from '@testing-library/react'

import { loadSkiaWeb } from '../loadSkiaWeb'
import { lazySkia as lazySkiaFromEntry } from '../skia'
import { lazySkia } from '../skia/lazySkia'

// The loader is held open by each test, so the order can be checked: the component's module may only be
// imported once loadSkiaWeb() has resolved (on web, once CanvasKit is set), never before.
jest.mock('../loadSkiaWeb', () => ({ loadSkiaWeb: jest.fn() }))

const mockedLoadSkiaWeb = jest.mocked(loadSkiaWeb)

interface BoardProps {
  label: string
}

// Stands in for an app's Skia component (no Skia needed: what's under test is when it's imported).
function Board({ label }: BoardProps) {
  return <span data-testid='board'>{label}</span>
}

function boardModule() {
  return jest.fn(() => Promise.resolve({ default: Board }))
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  mockedLoadSkiaWeb.mockImplementation(() => Promise.resolve())
})

describe('lazySkia', () => {
  it('is exported from @tastic/hud/skia', () => {
    expect(lazySkiaFromEntry).toBe(lazySkia)
  })

  it('loads nothing when it is called, only when the host first renders', () => {
    const load = boardModule()
    lazySkia<BoardProps>(load)
    expect(mockedLoadSkiaWeb).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
  })

  it('renders nothing and imports nothing until loadSkiaWeb resolves, then the component with its props', async () => {
    const gate = deferred()
    mockedLoadSkiaWeb.mockImplementation(() => gate.promise)
    const load = boardModule()
    const BoardHost = lazySkia<BoardProps>(load)

    const { container } = render(<BoardHost label='first' />)
    await act(async () => {})

    expect(mockedLoadSkiaWeb).toHaveBeenCalledTimes(1)
    expect(load).not.toHaveBeenCalled()
    // Suspense's fallback is null: nothing is drawn while CanvasKit loads.
    expect(container.innerHTML).toBe('')

    await act(async () => {
      gate.resolve()
    })

    expect(load).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('board').textContent).toBe('first')
  })

  it('loads once per host, however many times it renders, mounts or remounts', async () => {
    const load = boardModule()
    const BoardHost = lazySkia<BoardProps>(load)

    const first = render(<BoardHost label='a' />)
    render(<BoardHost label='b' />)
    await act(async () => {})
    expect(screen.getAllByTestId('board').map((node) => node.textContent)).toEqual(['a', 'b'])

    first.rerender(<BoardHost label='c' />)
    first.unmount()
    render(<BoardHost label='d' />)
    await act(async () => {})

    expect(screen.getAllByTestId('board').map((node) => node.textContent)).toEqual(['b', 'd'])
    expect(mockedLoadSkiaWeb).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('makes each call its own host, with its own load', async () => {
    const loadOne = boardModule()
    const loadTwo = boardModule()
    const One = lazySkia<BoardProps>(loadOne)
    const Two = lazySkia<BoardProps>(loadTwo)
    expect(One).not.toBe(Two)

    render(
      <>
        <One label='one' />
        <Two label='two' />
      </>
    )
    await act(async () => {})

    expect(loadOne).toHaveBeenCalledTimes(1)
    expect(loadTwo).toHaveBeenCalledTimes(1)
    expect(screen.getAllByTestId('board').map((node) => node.textContent)).toEqual(['one', 'two'])
  })
})
