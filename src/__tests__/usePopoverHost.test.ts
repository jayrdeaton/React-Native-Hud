import { act, renderHook } from '@testing-library/react'

import { usePopoverHost } from '../usePopoverHost'

describe('usePopoverHost', () => {
  it('starts closed', () => {
    const { result } = renderHook(() => usePopoverHost())
    expect(result.current.openId).toBeNull()
  })

  it('toggle opens an id, and opening a different id switches to it', () => {
    const { result } = renderHook(() => usePopoverHost())

    act(() => result.current.toggle('color'))
    expect(result.current.openId).toBe('color')

    act(() => result.current.toggle('controls'))
    expect(result.current.openId).toBe('controls')
  })

  it('toggling the same id again closes it', () => {
    const { result } = renderHook(() => usePopoverHost())

    act(() => result.current.toggle('color'))
    act(() => result.current.toggle('color'))
    expect(result.current.openId).toBeNull()
  })

  it('close() closes whatever is open, and is a no-op when already closed', () => {
    const { result } = renderHook(() => usePopoverHost())

    act(() => result.current.toggle('color'))
    act(() => result.current.close())
    expect(result.current.openId).toBeNull()

    act(() => result.current.close())
    expect(result.current.openId).toBeNull()
  })
})
