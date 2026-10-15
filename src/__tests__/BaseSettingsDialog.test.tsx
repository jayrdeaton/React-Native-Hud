import { Dialog, useBlurModule, useThemeSettings } from '@rific/auto-paper'
import { Button, SoundContext, TouchableRipple, useHapticSettings, useSoundSettings } from '@rific/feedback-press'
import { useUpdater } from '@rific/updater'
import { FakeLandscapeView, useIsTouchPrimaryDevice, useRotation } from '@tastic/core'
import { act, render } from '@testing-library/react'
import { Children, type ReactElement } from 'react'
import { Platform, ScrollView } from 'react-native'
import { Icon } from 'react-native-paper'

import { BaseSettingsDialog } from '../BaseSettingsDialog'
import { DialogHeader } from '../DialogHeader'
import { overlayActionStyles } from '../overlayCard'

jest.mock('../DialogHeader', () => {
  const actual = jest.requireActual('../DialogHeader')
  return { ...actual, DialogHeader: jest.fn(actual.DialogHeader) }
})

const baseProps = {
  visible: true,
  onDismiss: jest.fn(),
  version: '1.2.3',
  lockOrientation: false,
  onLockOrientationChange: jest.fn()
}

// TouchableRipple is a bare stub (see rific-feedback-press mock) - it never touches
// accessibilityLabel/onPress itself, so the only way to find "the row this test cares about" among
// however many TouchableRipples rendered is to inspect the mock's own captured calls, same pattern
// ReadyButton.test.tsx already uses.
function findRippleByLabel(label: string) {
  const call = (TouchableRipple as jest.Mock).mock.calls.find(([props]) => props.accessibilityLabel === label)
  if (!call) throw new Error(`No TouchableRipple rendered with accessibilityLabel "${label}"`)
  return call[0]
}

// Same technique, for the ConfirmDialog-rendered Button rows (update-confirm's Restart/Later, and
// the info-overlay's OK) - see ConfirmDialog.test.tsx's own findButtonByLabel for the original.
function findButtonByLabel(label: string) {
  const call = (Button as jest.Mock).mock.calls.find(([props]) => props.children === label)
  if (!call) throw new Error(`No Button rendered with label "${label}"`)
  return call[0]
}

// The react-native mock's StyleSheet.flatten is the identity, so a style array is merged here.
function flatStyle(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity))
}

describe('BaseSettingsDialog', () => {
  const originalOS = Platform.OS

  afterEach(() => {
    Platform.OS = originalOS
    ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(true)
    ;(useRotation as jest.Mock).mockReturnValue(0)
    ;(useBlurModule as jest.Mock).mockReturnValue(undefined)
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

  it('shows Keep Awake on a touch-primary device and reports the toggle', () => {
    const onKeepAwakeChange = jest.fn()
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} keepAwake onKeepAwakeChange={onKeepAwakeChange} />)

    expect(container.textContent).toContain('Keep Awake')
    expect(container.textContent).toContain('Stop auto-lock mid-match')
    findRippleByLabel('Keep awake on').onPress()

    expect(onKeepAwakeChange).toHaveBeenCalledWith(false)
    unmount()
  })

  it('hides Keep Awake on a desktop browser and omits it when the props are not passed', () => {
    ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(false)
    const desktopRender = render(<BaseSettingsDialog {...baseProps} keepAwake onKeepAwakeChange={jest.fn()} />)
    expect(desktopRender.container.textContent).not.toContain('Keep Awake')
    desktopRender.unmount()

    ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(true)
    const omittedRender = render(<BaseSettingsDialog {...baseProps} />)
    expect(omittedRender.container.textContent).not.toContain('Keep Awake')
    omittedRender.unmount()
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
    // Position, not just presence - this is the one contract that actually matters for `children`:
    // it has to land between Appearance and Check for Updates, not just anywhere in the tree.
    expect(text.indexOf('APPEARANCE')).toBeLessThan(text.indexOf('Board settings go here'))
    expect(text.indexOf('Board settings go here')).toBeLessThan(text.indexOf('Check for Updates'))
    unmount()
  })

  // Jay, 2026-10-15: every dialog opens with the same header and closes with the same single button.
  it("opens with the fleet's dialog header, compact once the sheet is turned onto a phone's short edge", () => {
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

    expect(container.textContent).toContain('Settings')
    expect((DialogHeader as unknown as jest.Mock).mock.lastCall![0]).toMatchObject({ icon: 'cog', title: 'Settings', compact: false })
    unmount()

    const { unmount: unmountTurned } = render(<BaseSettingsDialog {...baseProps} rotation={90} />)
    expect((DialogHeader as unknown as jest.Mock).mock.lastCall![0]).toMatchObject({ compact: true })
    unmountTurned()
  })

  // auto-paper's Dialog alone sits 32pt in from the edges and caps at 400; every overlay card sits 24pt
  // in and caps at 360, so on a phone the sheet was 16pt narrower than the confirm that followed it.
  it("is exactly as wide as the overlay cards: 24pt from the frame's edges, capped at 360", () => {
    const { unmount } = render(<BaseSettingsDialog {...baseProps} />)
    // The mocked 402pt-wide window.
    expect(flatStyle((Dialog as unknown as jest.Mock).mock.lastCall![0].style).width).toBe(354)
    unmount()

    const { unmount: unmountTurned } = render(<BaseSettingsDialog {...baseProps} rotation={90} />)
    // Turned: the frame is the window's 874pt height wide, so the cap applies.
    expect(flatStyle((Dialog as unknown as jest.Mock).mock.lastCall![0].style).width).toBe(360)
    unmountTurned()
  })

  // Jay, 2026-10-15: the header scrolls away with the rows so a long sheet gets the whole card; Done
  // stays pinned below the scroll area.
  it('scrolls the header away with the rows, and keeps Done outside the scroll area', () => {
    const { unmount } = render(<BaseSettingsDialog {...baseProps} />)

    const scrollChildren = Children.toArray((ScrollView as unknown as jest.Mock).mock.lastCall![0].children) as ReactElement[]
    expect(scrollChildren[0].type).toBe(DialogHeader)
    unmount()

    // Rendering only what the scroll area holds draws no Done button.
    ;(Button as jest.Mock).mockClear()
    const { unmount: unmountScrolled } = render(<>{scrollChildren}</>)
    expect((Button as jest.Mock).mock.calls.some(([props]) => props.children === 'Done')).toBe(false)
    unmountScrolled()
  })

  it('closes with a Done button styled like every other single-button dialog', () => {
    const onDismiss = jest.fn()
    const { unmount } = render(<BaseSettingsDialog {...baseProps} onDismiss={onDismiss} />)

    const done = findButtonByLabel('Done')
    expect(done).toMatchObject({ mode: 'contained', buttonColor: '#000004', textColor: '#000001', style: overlayActionStyles.actionButtonSingle })
    done.onPress()
    expect(onDismiss).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('omits the How to Play row when onShowHowToPlay is not passed', () => {
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

    expect(container.textContent).not.toContain('How to Play')
    unmount()
  })

  it('shows a How to Play row that dismisses Settings first and then calls onShowHowToPlay', () => {
    const calls: string[] = []
    const onDismiss = jest.fn(() => calls.push('dismiss'))
    const onShowHowToPlay = jest.fn(() => calls.push('show'))
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} onDismiss={onDismiss} onShowHowToPlay={onShowHowToPlay} />)

    expect(container.textContent).toContain('How to Play')
    findRippleByLabel('How to Play').onPress()

    // Order matters, not just that both fired: the guide's own overlay must never open on top of a
    // still-visible Settings card.
    expect(calls).toEqual(['dismiss', 'show'])
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

  // Lock Orientation and Edge Guard used to light up in secondary while Sound/Haptics (and every
  // toggle the apps add) used tertiary, so one row read as a different accent from the rest.
  it('gives every on/off row the same tertiary accent while on', () => {
    Platform.OS = 'ios'
    ;(useSoundSettings as jest.Mock).mockReturnValue({ settings: { enabled: true }, set: jest.fn() })
    ;(useHapticSettings as jest.Mock).mockReturnValue({ settings: { vibrate: true }, set: jest.fn() })
    ;(Icon as jest.Mock).mockClear()
    const { unmount } = render(<BaseSettingsDialog {...baseProps} lockOrientation deferBottomEdgeGestures onDeferBottomEdgeGestures={jest.fn()} keepAwake onKeepAwakeChange={jest.fn()} />)

    // '#000008' is the rific-auto-paper mock's tertiary (its secondary is '#000005').
    const iconColor = (source: string) => (Icon as jest.Mock).mock.calls.find(([props]) => props.source === source)?.[0].color
    expect(['lock', 'shield-check-outline', 'eye', 'volume-high', 'vibrate'].map(iconColor)).toEqual(Array(5).fill('#000008'))
    unmount()
  })

  it('surfaces a failed update check via onUpdateError, and a successful info result via the OK overlay', () => {
    Platform.OS = 'ios'
    const onUpdateError = jest.fn()
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} onUpdateError={onUpdateError} />)

    // useUpdater is a jest.fn() - the options object BaseSettingsDialog constructed is right there
    // in its last call, including the onError/onInfo/onConfirm callbacks it wired up internally.
    const calls = (useUpdater as jest.Mock).mock.calls
    const updaterOptions = calls[calls.length - 1][0]
    expect(updaterOptions.onError).toBe(onUpdateError)
    expect(typeof updaterOptions.onConfirm).toBe('function')

    expect(container.textContent).not.toContain('No update available')
    act(() => updaterOptions.onInfo('No update', 'No update available yet.'))
    expect(container.textContent).toContain('No update')
    expect(container.textContent).toContain('No update available yet.')

    act(() => {
      findButtonByLabel('OK').onPress()
    })
    expect(container.textContent).not.toContain('No update')

    unmount()
  })

  it('renders the Restart/Later ConfirmDialog when the manual-check onConfirm resolves with a manifest, instead of the native Alert fallback', async () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

    // Same lookup as the test above - the onConfirm callback passed through to useUpdater() is
    // what a real (unmocked) useUpdater would call instead of falling back to its own Alert-based
    // getUpdateConfirmation default, since onConfirm is no longer left undefined here.
    const calls = (useUpdater as jest.Mock).mock.calls
    const updaterOptions = calls[calls.length - 1][0]

    expect(container.textContent).not.toContain('Update Available')
    let pending!: Promise<boolean>
    act(() => {
      pending = updaterOptions.onConfirm({ createdAt: '2026-01-01T12:00:00.000Z' })
    })

    expect(container.textContent).toContain('Update Available')
    expect(container.textContent).toContain('Restart')
    expect(container.textContent).toContain('Later')

    act(() => {
      findButtonByLabel('Later').onPress()
    })
    expect(container.textContent).not.toContain('Update Available')
    await expect(pending).resolves.toBe(false)

    unmount()
  })

  it("resolves the manual-check onConfirm true when the update dialog's Restart is pressed", async () => {
    Platform.OS = 'ios'
    const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

    const calls = (useUpdater as jest.Mock).mock.calls
    const updaterOptions = calls[calls.length - 1][0]

    let pending!: Promise<boolean>
    act(() => {
      pending = updaterOptions.onConfirm({ createdAt: '2026-01-01T12:00:00.000Z' })
    })

    act(() => {
      findButtonByLabel('Restart').onPress()
    })
    expect(container.textContent).not.toContain('Update Available')
    await expect(pending).resolves.toBe(true)

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

  describe('Blur', () => {
    // Any non-null value stands in for the expo-blur module an app hands to auto-paper's Provider.
    const expoBlur = { BlurView: () => null }

    it("shows under Appearance once expo-blur is handed to auto-paper, and flips auto-paper's own setting", () => {
      Platform.OS = 'ios'
      ;(useBlurModule as jest.Mock).mockReturnValue(expoBlur)
      const set = jest.fn()
      ;(useThemeSettings as jest.Mock).mockReturnValueOnce({ settings: { blur: true }, set })
      const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

      const text = container.textContent ?? ''
      expect(text.indexOf('APPEARANCE')).toBeLessThan(text.indexOf('Blur'))
      findRippleByLabel('Blur on').onPress()

      expect(set).toHaveBeenCalledWith({ blur: false })
      unmount()
    })

    it('says what it blurs, under the label', () => {
      Platform.OS = 'ios'
      ;(useBlurModule as jest.Mock).mockReturnValue(expoBlur)
      const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

      expect(container.textContent).toContain('Frost behind dialogs')
      unmount()
    })

    it('turns blur back on from off', () => {
      Platform.OS = 'web'
      ;(useBlurModule as jest.Mock).mockReturnValue(expoBlur)
      const set = jest.fn()
      ;(useThemeSettings as jest.Mock).mockReturnValueOnce({ settings: { blur: false }, set })
      const { unmount } = render(<BaseSettingsDialog {...baseProps} />)

      findRippleByLabel('Blur off').onPress()

      expect(set).toHaveBeenCalledWith({ blur: true })
      unmount()
    })

    it('hides in an app that never handed expo-blur to auto-paper', () => {
      Platform.OS = 'ios'
      const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

      expect(container.textContent).not.toContain('Blur')
      unmount()
    })

    it('hides for a null module too', () => {
      Platform.OS = 'ios'
      ;(useBlurModule as jest.Mock).mockReturnValue(null)
      const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

      expect(container.textContent).not.toContain('Blur')
      unmount()
    })

    it("hides on Android, where these cards can't blur", () => {
      Platform.OS = 'android'
      ;(useBlurModule as jest.Mock).mockReturnValue(expoBlur)
      const { container, unmount } = render(<BaseSettingsDialog {...baseProps} />)

      expect(container.textContent).not.toContain('Blur')
      unmount()
    })

    it('hides along with the rest of Appearance via hideAppearance', () => {
      Platform.OS = 'ios'
      ;(useBlurModule as jest.Mock).mockReturnValue(expoBlur)
      const { container, unmount } = render(<BaseSettingsDialog {...baseProps} hideAppearance />)

      expect(container.textContent).not.toContain('Blur')
      unmount()
    })
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

  describe('rotation', () => {
    function lastFrameProps() {
      const calls = (FakeLandscapeView as unknown as jest.Mock).mock.calls
      return calls[calls.length - 1][0]
    }

    function lastDialogStyle() {
      const calls = (Dialog as unknown as jest.Mock).mock.calls
      return calls[calls.length - 1][0].style
    }

    it('lays the sheet out in a pass-through frame turned by the live rotation when the prop is omitted', () => {
      ;(useRotation as jest.Mock).mockReturnValue(180)
      const { unmount } = render(<BaseSettingsDialog {...baseProps} />)

      expect(lastFrameProps()).toMatchObject({ rotation: 180, passThrough: true })
      // The frame does the turning, so the card itself carries no transform.
      expect(flatStyle(lastDialogStyle())).toEqual({ maxHeight: '90%', width: 354 })
      unmount()
    })

    it('honors an explicit rotation prop over the ambient useRotation() value', () => {
      ;(useRotation as jest.Mock).mockReturnValue(180)
      const { unmount } = render(<BaseSettingsDialog {...baseProps} rotation={90} />)

      expect(lastFrameProps()).toMatchObject({ rotation: 90, passThrough: true })
      expect(flatStyle(lastDialogStyle())).toEqual({ maxHeight: '90%', width: 360 })
      unmount()
    })

    it('mounts no frame before the first open', () => {
      ;(FakeLandscapeView as unknown as jest.Mock).mockClear()
      const { unmount } = render(<BaseSettingsDialog {...baseProps} visible={false} />)

      expect(FakeLandscapeView).not.toHaveBeenCalled()
      unmount()
    })

    it('keeps the frame mounted after closing, so the close fade is not cut short', () => {
      const { rerender, unmount } = render(<BaseSettingsDialog {...baseProps} visible={false} />)
      rerender(<BaseSettingsDialog {...baseProps} visible />)
      ;(FakeLandscapeView as unknown as jest.Mock).mockClear()
      rerender(<BaseSettingsDialog {...baseProps} visible={false} />)

      expect(FakeLandscapeView).toHaveBeenCalled()
      const dialogCalls = (Dialog as unknown as jest.Mock).mock.calls
      expect(dialogCalls[dialogCalls.length - 1][0].visible).toBe(false)
      unmount()
    })
  })
})
