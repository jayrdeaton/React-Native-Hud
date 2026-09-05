import { IconButton, TouchableRipple } from '@rific/feedback-press'
import { useIsTouchPrimaryDevice } from '@tastic/core'
import { act, render } from '@testing-library/react'
import { ReactNode, useEffect } from 'react'
import { Platform } from 'react-native'

import { ControlSchemePicker, ControlSchemePickerProps } from '../ControlSchemePicker'
import { MenuOption } from '../SectionedDropdown'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

type Scheme = 'mouse' | 'wasd' | 'arrows'

const PICKER_ID = 'p1-controls'
const OPTIONS: MenuOption<Scheme>[] = [
  { value: 'mouse', label: 'Mouse' },
  { value: 'wasd', label: 'WASD' },
  { value: 'arrows', label: 'Arrows' }
]

const baseProps = {
  id: PICKER_ID,
  value: 'mouse' as Scheme,
  onChange: jest.fn(),
  options: OPTIONS,
  accentColor: '#3366ff',
  mutedColor: '#888888',
  dark: false
}

type HostBox = { current: PopoverHost | null }

function Harness({ hostBoxRef, ...overrides }: { hostBoxRef: HostBox } & Partial<Omit<ControlSchemePickerProps<Scheme>, 'host'>>) {
  const host = usePopoverHost()
  useEffect(() => {
    hostBoxRef.current = host
  })
  return <ControlSchemePicker {...baseProps} {...overrides} host={host} />
}

// Same two-microtask-hop flush SectionedDropdown.test.tsx needs — see that file's own `settle` doc:
// TriggerGaugeHost's lazy(() => import('./TriggerGauge')) mounts on every render this component
// actually reaches SectionedDropdown for, not just while a popover is open.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function renderPicker(overrides: Partial<Omit<ControlSchemePickerProps<Scheme>, 'host'>> = {}) {
  const hostBoxRef: HostBox = { current: null }
  const result = render(<Harness hostBoxRef={hostBoxRef} {...overrides} />)
  await settle()
  return { ...result, hostBoxRef }
}

function triggerProps(label = 'Control scheme') {
  const calls = (IconButton as jest.Mock).mock.calls
  for (let i = calls.length - 1; i >= 0; i--) {
    if (calls[i][0]?.accessibilityLabel === label) return calls[i][0]
  }
  throw new Error(`no trigger IconButton call found for accessibilityLabel "${label}"`)
}

async function open() {
  act(() => {
    triggerProps().onPress()
  })
  await settle()
}

function containsLabel(node: unknown, label: string): boolean {
  if (node == null || typeof node === 'boolean') return false
  if (typeof node === 'string' || typeof node === 'number') return String(node) === label
  if (Array.isArray(node)) return node.some((child) => containsLabel(child, label))
  if (typeof node === 'object' && 'props' in (node as { props?: { children?: ReactNode } })) {
    return containsLabel((node as { props?: { children?: ReactNode } }).props?.children, label)
  }
  return false
}

function rowProps(label: string) {
  const calls = (TouchableRipple as jest.Mock).mock.calls
  for (let i = calls.length - 1; i >= 0; i--) {
    if (containsLabel(calls[i][0]?.children, label)) return calls[i][0]
  }
  throw new Error(`no TouchableRipple row found containing label "${label}"`)
}

function pick(label: string) {
  act(() => {
    rowProps(label).onPress()
  })
}

function bodyText(): string {
  return document.body.textContent ?? ''
}

describe('ControlSchemePicker', () => {
  const originalOS = Platform.OS

  afterEach(() => {
    Platform.OS = originalOS
    ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(true)
  })

  describe('gating', () => {
    it('renders nothing on native (Platform.OS !== web), even on a non-touch-primary device', async () => {
      Platform.OS = 'ios'
      ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(false)
      const { container } = await renderPicker()

      expect(container.textContent).toBe('')
    })

    it('renders nothing on web while touch-primary (a phone/tablet browser)', async () => {
      Platform.OS = 'web'
      ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(true)
      const { container } = await renderPicker()

      expect(container.textContent).toBe('')
    })

    it('renders the trigger on web when not touch-primary (a desktop browser)', async () => {
      Platform.OS = 'web'
      ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(false)
      await renderPicker()

      expect(triggerProps().accessibilityLabel).toBe('Control scheme')
    })
  })

  describe('once shown (web, non-touch-primary)', () => {
    beforeEach(() => {
      Platform.OS = 'web'
      ;(useIsTouchPrimaryDevice as jest.Mock).mockReturnValue(false)
    })

    it('opens via the trigger and lists every option', async () => {
      const { hostBoxRef } = await renderPicker()

      await open()

      const text = bodyText()
      expect(text).toContain('Mouse')
      expect(text).toContain('WASD')
      expect(text).toContain('Arrows')
      expect(hostBoxRef.current?.openId).toBe(PICKER_ID)
    })

    it('picking an option calls onChange with its value and closes the popover', async () => {
      const onChange = jest.fn()
      const { hostBoxRef } = await renderPicker({ onChange })

      await open()
      pick('WASD')

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('wasd')
      expect(hostBoxRef.current?.openId).toBeNull()
    })

    it("keeps the other seat's taken scheme visible but disabled, via takenValue", async () => {
      await renderPicker({ takenValue: 'arrows' })

      await open()

      expect(bodyText()).toContain('Arrows')
      expect(rowProps('Arrows').disabled).toBe(true)
    })

    it('leaves every option enabled and selectable when no takenValue is given', async () => {
      const onChange = jest.fn()
      await renderPicker({ onChange })

      await open()
      pick('Arrows')

      expect(rowProps('Arrows').disabled).toBeFalsy()
      expect(onChange).toHaveBeenCalledWith('arrows')
    })
  })
})
