// Only the Keep Awake hooks BaseSettingsDialog reads. No module injected by default, so the row stays
// hidden unless a test hands one back from useExpoKeepAwake.
export const useKeepAwakeSettings = jest.fn(() => ({
  settings: { enabled: true },
  set: jest.fn()
}))

export const useExpoKeepAwake = jest.fn((): { activateKeepAwakeAsync: () => Promise<void>; deactivateKeepAwake: () => Promise<void> } | undefined => undefined)
