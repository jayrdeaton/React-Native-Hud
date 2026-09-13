import { Button } from '@rific/feedback-press'
import { useUpdater } from '@rific/updater'
import { act, render } from '@testing-library/react'

import { UpdateDialog } from '../UpdateDialog'

const manifest = { createdAt: '2026-01-01T12:00:00.000Z' }

// Button is a bare stub (see rific-feedback-press mock) that renders its own `children` — same
// label-based lookup ConfirmDialog.test.tsx already uses, since both of ConfirmDialog's own
// buttons render a plain string label.
function findButtonByLabel(label: string) {
  const call = (Button as jest.Mock).mock.calls.find(([props]) => props.children === label)
  if (!call) throw new Error(`No Button rendered with label "${label}"`)
  return call[0]
}

// useUpdater is a jest.fn() (see rific-updater mock) — the options object UpdateDialog
// constructed, onConfirm included, is right there in its last call, same technique
// BaseSettingsDialog.test.tsx already uses for its own useUpdater assertions.
function latestOnConfirm() {
  const calls = (useUpdater as jest.Mock).mock.calls
  return calls[calls.length - 1][0].onConfirm as (next: typeof manifest) => Promise<boolean>
}

describe('UpdateDialog', () => {
  it('renders nothing with no manifest', () => {
    const { container, unmount } = render(<UpdateDialog />)
    expect(container.textContent).toBe('')
    unmount()
  })

  it('renders the Restart/Later ConfirmDialog once onConfirm resolves with a manifest', () => {
    const { container, unmount } = render(<UpdateDialog />)
    const onConfirm = latestOnConfirm()

    act(() => {
      onConfirm(manifest)
    })

    expect(container.textContent).toContain('Update Available')
    expect(container.textContent).toContain('Restart')
    expect(container.textContent).toContain('Later')
    unmount()
  })

  it('resolves the promise false when Later is pressed', async () => {
    const { unmount } = render(<UpdateDialog />)
    const onConfirm = latestOnConfirm()

    let pending!: Promise<boolean>
    act(() => {
      pending = onConfirm(manifest)
    })

    act(() => {
      findButtonByLabel('Later').onPress()
    })

    await expect(pending).resolves.toBe(false)
    unmount()
  })

  it('resolves the promise true when Restart is pressed', async () => {
    const { unmount } = render(<UpdateDialog />)
    const onConfirm = latestOnConfirm()

    let pending!: Promise<boolean>
    act(() => {
      pending = onConfirm(manifest)
    })

    act(() => {
      findButtonByLabel('Restart').onPress()
    })

    await expect(pending).resolves.toBe(true)
    unmount()
  })
})
