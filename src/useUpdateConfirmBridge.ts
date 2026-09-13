import type { UpdateManifest } from '@rific/updater'
import { useCallback, useRef, useState } from 'react'

// Bridges @rific/updater's async onConfirm: (manifest) => Promise<boolean> into plain render
// state a ConfirmDialog can drive: `manifest` is the pending update to show (or null when there's
// nothing to confirm), and `respond` both resolves the promise onConfirm handed back to useUpdater
// and clears `manifest` so the dialog closes. Internal - not exported from index.ts. Shared by
// UpdateDialog and BaseSettingsDialog's own manual-check flow, so each only owns its own
// useUpdater() instance (see BaseSettingsDialog's comment on why that instance can't be shared).
export function useUpdateConfirmBridge() {
  const [manifest, setManifest] = useState<UpdateManifest | null>(null)
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null)

  const onConfirm = useCallback(
    (next: UpdateManifest) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve
        setManifest(next)
      }),
    []
  )

  const respond = useCallback((confirmed: boolean) => {
    setManifest(null)
    resolveRef.current?.(confirmed)
    resolveRef.current = null
  }, [])

  return { manifest, onConfirm, respond }
}
