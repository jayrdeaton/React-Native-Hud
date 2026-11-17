import { Button } from '@rific/feedback-press'
import { useUpdater } from '@rific/updater'
import { act, render } from '@testing-library/react'

import { releasedLabel, UpdateDialog } from '../UpdateDialog'

const manifest = { createdAt: '2026-01-01T12:00:00.000Z' }

// Button is a bare stub (see rific-feedback-press mock) that renders its own `children` - same
// label-based lookup ConfirmDialog.test.tsx already uses, since both of ConfirmDialog's own
// buttons render a plain string label.
function findButtonByLabel(label: string) {
  const call = (Button as jest.Mock).mock.calls.find(([props]) => props.children === label)
  if (!call) throw new Error(`No Button rendered with label "${label}"`)
  return call[0]
}

// useUpdater is a jest.fn() (see rific-updater mock) - the options object UpdateDialog
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

describe('releasedLabel', () => {
  // Local times, so the calendar-day counting doesn't depend on the machine's time zone
  const now = new Date(2026, 10, 17, 10, 30)
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  it('says today or yesterday, by the calendar, with the time to the minute', () => {
    const today = new Date(2026, 10, 17, 10, 18, 53)
    expect(releasedLabel(today, now)).toBe(`Released today at ${time(today)}`)
    expect(releasedLabel(today, now)).not.toMatch(/:53/)
    const lateLastNight = new Date(2026, 10, 16, 23, 5)
    expect(releasedLabel(lateLastNight, new Date(2026, 10, 17, 1, 0))).toBe(`Released yesterday at ${time(lateLastNight)}`)
  })

  it('gives a short date before that, and the year only when it is not this one', () => {
    const lastWeek = new Date(2026, 10, 10, 9, 30)
    expect(releasedLabel(lastWeek, now)).toBe(`Released ${lastWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${time(lastWeek)}`)
    const lastYear = new Date(2025, 11, 30, 9, 30)
    expect(releasedLabel(lastYear, now)).toContain('2025')
    expect(releasedLabel(lastWeek, now)).not.toContain('2026')
  })

  it('counts a day across a daylight-saving change as one', () => {
    // The days the clocks change in North America in 2026 (March 8 and November 1), whose midnights are 23 and 25 hours apart where
    // they change; still yesterday (in a time zone without the change, a plain day)
    const springForward = new Date(2026, 2, 8, 12, 0)
    expect(releasedLabel(springForward, new Date(2026, 2, 9, 12, 0))).toMatch(/^Released yesterday at /)
    const fallBack = new Date(2026, 10, 1, 12, 0)
    expect(releasedLabel(fallBack, new Date(2026, 10, 2, 12, 0))).toMatch(/^Released yesterday at /)
  })
})
