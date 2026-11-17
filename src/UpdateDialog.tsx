import { useUpdater } from '@rific/updater'
import { type ViewRotation } from '@tastic/core'

import { ConfirmDialog } from './ConfirmDialog'
import { useUpdateConfirmBridge } from './useUpdateConfirmBridge'

export interface UpdateDialogProps {
  // Same live physical-hold rotation convention as ConfirmDialog/BaseSettingsDialog's own rotation
  // prop - defaults to 0 for a caller with no per-player zone to match.
  rotation?: ViewRotation
  autoCheck?: boolean
  autoPrompt?: boolean
  onError?: (message: string) => void
}

const DAY_MS = 86_400_000

// When an update was released, as a person would say it: "Released today at 10:18 AM", "Released yesterday at 4:05 PM", "Released
// Nov 14 at 9:30 AM", with the year when it isn't this one ("Released Dec 30, 2025 at 9:30 AM"), in the device's own locale (a 24-hour
// clock where that's the custom). It read "Released 11/17/2026 at 10:18:53 AM", seconds and all, like a log line (Jay, 2026-11-17, from
// HexFleet). Days are counted on the calendar, midnight to midnight, so a release at 11 pm is "yesterday" at 1 am; rounded, so a
// daylight-saving day of 23 or 25 hours still counts as one
export function releasedLabel(date: Date, now: Date = new Date()): string {
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((midnight(now) - midnight(date)) / DAY_MS)
  const thisYear = date.getFullYear() === now.getFullYear()
  const day = days === 0 ? 'today' : days === 1 ? 'yesterday' : date.toLocaleDateString(undefined, thisYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
  return `Released ${day} at ${time}`
}

// Drop-in background updater: mount once (e.g. an app's root layout) and it owns its own
// useUpdater() instance end to end, rendering a themed ConfirmDialog instead of useUpdater's
// default Alert-based prompt whenever an update is found. BaseSettingsDialog's own manual "Check
// for Updates" button deliberately does NOT render this component - see its own comment on why
// that flow keeps a second, separate useUpdater() instance instead of reusing this one.
export function UpdateDialog({ rotation = 0, autoCheck = true, autoPrompt = true, onError }: UpdateDialogProps) {
  const { manifest, onConfirm, respond } = useUpdateConfirmBridge()
  useUpdater({ autoCheck, autoPrompt, onConfirm, onError })

  const date = manifest ? new Date(manifest.createdAt) : null

  return <ConfirmDialog visible={!!manifest} title='Update Available' message={date ? releasedLabel(date) : ''} confirmLabel='Restart' cancelLabel='Later' icon='update' rotation={rotation} onConfirm={() => respond(true)} onCancel={() => respond(false)} />
}
