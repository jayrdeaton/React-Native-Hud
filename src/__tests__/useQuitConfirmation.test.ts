import { act, renderHook } from '@testing-library/react'

import { useQuitConfirmation } from '../useQuitConfirmation'

describe('useQuitConfirmation', () => {
  it('calls onConfirmedBack immediately and never shows the dialog when there is no progress', () => {
    const onConfirmedBack = jest.fn()
    const { result } = renderHook(() => useQuitConfirmation(() => false, onConfirmedBack))

    act(() => result.current.requestBack())

    expect(onConfirmedBack).toHaveBeenCalledTimes(1)
    expect(result.current.confirmVisible).toBe(false)
  })

  it('shows the dialog instead of calling onConfirmedBack when there is progress', () => {
    const onConfirmedBack = jest.fn()
    const { result } = renderHook(() => useQuitConfirmation(() => true, onConfirmedBack))

    act(() => result.current.requestBack())

    expect(onConfirmedBack).not.toHaveBeenCalled()
    expect(result.current.confirmVisible).toBe(true)
  })

  it('cancelBack resets confirmVisible to false', () => {
    const { result } = renderHook(() => useQuitConfirmation(() => true, jest.fn()))

    act(() => result.current.requestBack())
    expect(result.current.confirmVisible).toBe(true)

    act(() => result.current.cancelBack())
    expect(result.current.confirmVisible).toBe(false)
  })

  it('picks up a hasProgress flip between renders on the next requestBack call, not a stale closure', () => {
    const onConfirmedBack = jest.fn()
    const { result, rerender } = renderHook(({ hasProgress }) => useQuitConfirmation(hasProgress, onConfirmedBack), { initialProps: { hasProgress: () => false } })

    rerender({ hasProgress: () => true })
    act(() => result.current.requestBack())
    expect(onConfirmedBack).not.toHaveBeenCalled()
    expect(result.current.confirmVisible).toBe(true)

    act(() => result.current.cancelBack())
    rerender({ hasProgress: () => false })
    act(() => result.current.requestBack())
    expect(onConfirmedBack).toHaveBeenCalledTimes(1)
    expect(result.current.confirmVisible).toBe(false)
  })

  it('reads hasProgress lazily, so the hook can be called before the value it depends on exists yet on this render', () => {
    // Regression test for the real bug this design fixes: a caller whose progress check depends on
    // state produced AFTER this hook is called (e.g. useGameState's own return value, which itself
    // needs `paused` derived from this hook's confirmVisible) must still work - the getter is only
    // invoked inside requestBack, never during the render that defines it.
    let liveScore = 0
    const onConfirmedBack = jest.fn()
    const { result } = renderHook(() => useQuitConfirmation(() => liveScore > 0, onConfirmedBack))

    liveScore = 5
    act(() => result.current.requestBack())

    expect(onConfirmedBack).not.toHaveBeenCalled()
    expect(result.current.confirmVisible).toBe(true)
  })

  it('requestBack and cancelBack have a stable identity across re-renders', () => {
    const { result, rerender } = renderHook(({ hasProgress }) => useQuitConfirmation(hasProgress, jest.fn()), { initialProps: { hasProgress: () => false } })
    const { requestBack, cancelBack } = result.current

    rerender({ hasProgress: () => true })

    expect(result.current.requestBack).toBe(requestBack)
    expect(result.current.cancelBack).toBe(cancelBack)
  })
})
