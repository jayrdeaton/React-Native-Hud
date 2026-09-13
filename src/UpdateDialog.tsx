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

// Drop-in background updater: mount once (e.g. an app's root layout) and it owns its own
// useUpdater() instance end to end, rendering a themed ConfirmDialog instead of useUpdater's
// default Alert-based prompt whenever an update is found. BaseSettingsDialog's own manual "Check
// for Updates" button deliberately does NOT render this component - see its own comment on why
// that flow keeps a second, separate useUpdater() instance instead of reusing this one.
export function UpdateDialog({ rotation = 0, autoCheck = true, autoPrompt = true, onError }: UpdateDialogProps) {
  const { manifest, onConfirm, respond } = useUpdateConfirmBridge()
  useUpdater({ autoCheck, autoPrompt, onConfirm, onError })

  const date = manifest ? new Date(manifest.createdAt) : null

  return <ConfirmDialog visible={!!manifest} title='Update Available' message={date ? `Released ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}` : ''} confirmLabel='Restart' cancelLabel='Later' icon='update' rotation={rotation} onConfirm={() => respond(true)} onCancel={() => respond(false)} />
}
