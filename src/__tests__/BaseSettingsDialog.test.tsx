import { SoundContext, TouchableRipple, useHapticSettings, useSoundSettings } from '@rific/feedback-press'
import { useUpdater } from '@rific/updater'
import { useIsTouchPrimaryDevice } from '@tastic/core'
import { act, render } from '@testing-library/react'
import { Platform } from 'react-native'

import { BaseSettingsDialog } from '../BaseSettingsDialog'

const baseProps = {
  visible: true,
  onDismiss: jest.fn(),
  version: '1.2.3',
  lockOrientation: false,
  onLockOrientationChange: jest.fn()
}

// TouchableRipple is a bare stub (see rific-feedback-press mock) — it never touches
// accessibilityLabel/onPress itself, so the only way to find "the row this test cares about" among
// however many TouchableRipples rendered is to inspect the mock's own captured calls, same pattern
// ReadyButton.test.tsx already uses.
function findRippleByLabel(label: string) {
  const call = (TouchableRipple as jest.Mock).mock.calls.find(([props]) => props.accessibilityLabel === label)
  if (!call) throw new Error(`No TouchableRipple rendered with accessibilityLabel "${label}"`)
  return call[0]
}

describe('BaseSettingsDialog', () => {
  const originalOS = Platform.OS

  afterEach(() => {
    Platform.OS = originalOS
    ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(true)
  })

  it('renders nothing while not visible', () => {
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} visible={false} />)
    expect(container.textContent).toBe('')
    unmount()
  })

  it('shows Lock Orientation on a touch-primary device and reports the toggle', () => {
    const onLockOrientationChange = jest.fn()
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} lockOrientation={false} onLockOrientationChange={onLockOrientationChange} />)

    expect(container.textContent).toContain('Lock Orientation')
    findRippleByLabel('Lock orientation off').onPress()

    expect(onLockOrientationChange).toHaveBeenCalledWith(true)
    unmount()
  })

  it('hides Lock Orientation on a non-touch-primary device (desktop web)', () => {
    ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(false)
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

    expect(container.textContent).not.toContain('Lock Orientation')
    unmount()
  })

  it('omits Lock Orientation when the props are not passed at all (a portrait-only game)', () => {
    const { visible, onDismiss, version } = baseProps
    const { container, unmount } = render(<BaseSettingsDialog visible={visible} onDismiss={onDismiss} version={version} />)

    expect(container.textContent).not.toContain('Lock Orientation')
    unmount()
  })

  it('omits Edge Guard when the defer props are not passed at all', () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

    expect(container.textContent).not.toContain('Edge Guard')
    unmount()
  })

  it('shows Edge Guard on iOS when the defer props are passed, and reports the toggle', () => {
    Platform.OS = 'ios'
    const onDeferBottomEdgeGestures = jest.fn()
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} deferBottomEdgeGestures={false} onDeferBottomEdgeGestures={onDeferBottomEdgeGestures} />)

    expect(container.textContent).toContain('Edge Guard')
    findRippleByLabel('Edge guard off').onPress()

    expect(onDeferBottomEdgeGestures).toHaveBeenCalledWith(true)
    unmount()
  })

  it('hides Edge Guard on non-iOS platforms even when the defer props are passed', () => {
    Platform.OS = 'android'
    const androidRender = render(<BaseSettingsDialog {...baseProps} deferBottomEdgeGestures={false} onDeferBottomEdgeGestures={jest.fn()} />)
    expect(androidRender.container.textContent).not.toContain('Edge Guard')
    androidRender.unmount()

    Platform.OS = 'web'
    const webRender = render(<BaseSettingsDialog {...baseProps} deferBottomEdgeGestures={false} onDeferBottomEdgeGestures={jest.fn()} />)
    expect(webRender.container.textContent).not.toContain('Edge Guard')
    webRender.unmount()
  })

  it('shows the version string and Check for Updates on native, hides both on web', () => {
    Platform.OS = 'ios'
    const nativeRender = render(<BaseSettingsDialog {...baseProps} />)
    expect(nativeRender.container.textContent).toContain('VERSION 1.2.3')
    expect(nativeRender.container.textContent).toContain('Check for Updates')
    nativeRender.unmount()

    Platform.OS = 'web'
    const webRender = render(<BaseSettingsDialog {...baseProps} />)
    expect(webRender.container.textContent).not.toContain('VERSION')
    expect(webRender.container.textContent).not.toContain('Check for Updates')
    webRender.unmount()
  })

  it('renders app-specific children between Appearance and Check for Updates', () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(
      <BaseSettingsDialog {...baseProps}>
        <>Board settings go here</>
      </BaseSettingsDialog>
    )

    const text = container.textContent ?? ''
    expect(text).toContain('Board settings go here')
    // Position, not just presence — this is the one contract that actually matters for `children`:
    // it has to land between Appearance and Check for Updates, not just anywhere in the tree.
    expect(text.indexOf('APPEARANCE')).toBeLessThan(text.indexOf('Board settings go here'))
    expect(text.indexOf('Board settings go here')).toBeLessThan(text.indexOf('Check for Updates'))
    unmount()
  })

  it('toggles Sound and fires the selection sound only when turning it on', () => {
    const set = jest.fn()
    ;(useSoundSettings as jest.Mock).mockReturnValue({ settings: { enabled: false }, set })
    const selection = jest.fn()
    const { unmount } = render(
      <SoundContext.Provider value={{ selection }}>
        <BaseSettingsDialog {...baseProps} />
      </SoundContext.Provider>
    )

    findRippleByLabel('Sound off').onPress()

    expect(set).toHaveBeenCalledWith({ enabled: true })
    expect(selection).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('toggles Haptics on native, and omits the row entirely on web', () => {
    Platform.OS = 'ios'
    const set = jest.fn()
    ;(useHapticSettings as jest.Mock).mockReturnValue({ settings: { vibrate: false }, set })
    const nativeRender = render(<BaseSettingsDialog {...baseProps} />)

    findRippleByLabel('Haptics off').onPress()
    expect(set).toHaveBeenCalledWith({ vibrate: true })
    nativeRender.unmount()

    Platform.OS = 'web'
    const webRender = render(<BaseSettingsDialog {...baseProps} />)
    expect(webRender.container.textContent).not.toContain('Haptics')
    webRender.unmount()
  })

  it('surfaces a failed update check via onUpdateError, and a successful info result via the OK overlay', () => {
    Platform.OS = 'ios'
    const onUpdateError = jest.fn()
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} onUpdateError={onUpdateError} />)

    // useUpdater is a jest.fn() — the options object BaseSettingsDialog constructed is right there
    // in its last call, including the onError/onInfo callbacks it wired up internally.
    const calls = (useUpdater as jest.Mock).mock.calls
    const updaterOptions = calls[calls.length - 1][0]
    expect(updaterOptions.onError).toBe(onUpdateError)

    expect(container.textContent).not.toContain('No update available')
    act(() => updaterOptions.onInfo('No update', 'No update available yet.'))
    expect(container.textContent).toContain('No update')
    expect(container.textContent).toContain('No update available yet.')

    unmount()
  })

  it('hides Sound via hideSound, without hiding Haptics alongside it', () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} hideSound />)

    expect(container.textContent).not.toContain('Sound')
    expect(container.textContent).toContain('Haptics')
    unmount()
  })

  it('hides Haptics via hideHaptics even on native, without hiding Sound alongside it', () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} hideHaptics />)

    expect(container.textContent).toContain('Sound')
    expect(container.textContent).not.toContain('Haptics')
    unmount()
  })

  it('omits the whole Sound/Haptics row when both are hidden', () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} hideSound hideHaptics />)

    expect(container.textContent).not.toContain('Sound')
    expect(container.textContent).not.toContain('Haptics')
    unmount()
  })

  it('hides Appearance via hideAppearance', () => {
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} hideAppearance />)

    expect(container.textContent).not.toContain('APPEARANCE')
    unmount()
  })

  it('hides Check for Updates via hideUpdateCheck even on native', () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} hideUpdateCheck />)

    expect(container.textContent).not.toContain('Check for Updates')
    expect(container.textContent).not.toContain('VERSION')
    unmount()
  })
})
