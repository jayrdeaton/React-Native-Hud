import { getColorRoles } from '@rific/auto-paper'
import { IconButton, TouchableRipple } from '@rific/feedback-press'
import { act, render } from '@testing-library/react'
import { ReactNode, useEffect } from 'react'

import { mockMeasureInWindow } from '../__mocks__/react-native'
import { MenuSection, MultiSelectSection, SectionedDropdown, SingleSelectSection } from '../SectionedDropdown'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

// ---- fixtures -------------------------------------------------------------

const DROPDOWN_ID = 'dropdown'
const TRIGGER_LABEL = 'dropdown-trigger'

const baseProps = {
  id: DROPDOWN_ID,
  icon: 'cog',
  accessibilityLabel: TRIGGER_LABEL,
  accentColor: '#3366ff',
  mutedColor: '#888888',
  dark: false
}

function makeSingle(overrides: Partial<SingleSelectSection<string>> = {}): SingleSelectSection<string> {
  return {
    kind: 'single',
    id: 'single-section',
    options: [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Bravo' },
      { value: 'c', label: 'Charlie' }
    ],
    value: 'a',
    onChange: jest.fn(),
    ...overrides
  }
}

function makeMulti(overrides: Partial<MultiSelectSection<string>> = {}): MultiSelectSection<string> {
  return {
    kind: 'multi',
    id: 'multi-section',
    options: [
      { value: 'x', label: 'Xray' },
      { value: 'y', label: 'Yankee' },
      { value: 'z', label: 'Zulu' }
    ],
    value: [],
    onChange: jest.fn(),
    ...overrides
  }
}

// Mutable box a Harness instance writes the real hook's current host into on every render, so a
// test can inspect host.openId directly without needing DOM-based signals for it.
type HostBox = { current: PopoverHost | null }

function Harness({ hostBoxRef, sections, ...overrides }: { hostBoxRef: HostBox; sections: MenuSection[] } & Partial<Omit<Parameters<typeof SectionedDropdown>[0], 'host' | 'sections'>>) {
  const host = usePopoverHost()
  // Assigned in an effect (after commit), not during render, so tests can read the real hook's
  // current openId/toggle/close without mutating a ref mid-render.
  useEffect(() => {
    hostBoxRef.current = host
  })
  return <SectionedDropdown {...baseProps} {...overrides} host={host} sections={sections} />
}

// TriggerGaugeHost (and its lazy(() => import('./TriggerGauge'))) mounts unconditionally on every
// render of SectionedDropdown, regardless of whether the popover itself is open — so every render,
// not just an `open()`, needs the same settle step below or React warns about a Suspense resource
// resolving outside act().
async function renderDropdown(sections: MenuSection[], overrides: Partial<Parameters<typeof SectionedDropdown>[0]> = {}) {
  const hostBoxRef: HostBox = { current: null }
  render(<Harness hostBoxRef={hostBoxRef} sections={sections} {...overrides} />)
  await settle()
  return hostBoxRef
}

// Flushes the loadSkiaWeb().then(() => import(...).then(...)) chain behind TriggerGaugeHost's lazy
// import — two chained microtask hops, so a bare `await act(async () => {})` (which only drains
// microtasks already queued when it starts) isn't reliably enough; a macrotask flush via setTimeout
// guarantees every microtask queued along the way has drained first.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

// Grabs the trigger's own IconButton call (identified by accessibilityLabel, since a test may render
// more than one dropdown/trigger) rather than assuming call order — the mock's call list accumulates
// across every re-render within the test.
function triggerProps(label = TRIGGER_LABEL) {
  const calls = (IconButton as jest.Mock).mock.calls
  for (let i = calls.length - 1; i >= 0; i--) {
    if (calls[i][0]?.accessibilityLabel === label) return calls[i][0]
  }
  throw new Error(`no trigger IconButton call found for accessibilityLabel "${label}"`)
}

async function open(label = TRIGGER_LABEL) {
  act(() => {
    triggerProps(label).onPress()
  })
  await settle()
}

// Recursively searches a React element tree (as captured in a mock's props.children) for a string
// child equal to `label` — this is how we locate a specific row's onPress, since every option row
// renders via the TouchableRipple mock (a stub that only passes children through, so it isn't
// clickable through the DOM) and carries no prop identifying which option it is other than its
// rendered content.
function containsLabel(node: unknown, label: string): boolean {
  if (node == null || typeof node === 'boolean') return false
  if (typeof node === 'string' || typeof node === 'number') return String(node) === label
  if (Array.isArray(node)) return node.some((child) => containsLabel(child, label))
  if (typeof node === 'object' && 'props' in (node as { props?: { children?: ReactNode } })) {
    return containsLabel((node as { props?: { children?: ReactNode } }).props?.children, label)
  }
  return false
}

// Finds the most recent TouchableRipple render whose subtree contains `label` and returns its props
// (onPress, style, ...). Covers both option rows and the allClear footer button, which are all
// TouchableRipple instances distinguished only by their rendered label.
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

// None of the mocked primitives (View/ScrollView/Pressable/TouchableRipple all just pass their
// `children` straight through, and Text does the same) ever render an actual host DOM element —
// only the plain strings survive, as bare text nodes with no wrapping tag. That means
// getByText/queryByText (which only ever match real elements) can't isolate one label once more
// than one Text sibling is on screen — they'd all collapse into one shared parent's concatenated
// textContent. Asserting directly against the rendered text is the reliable substitute.
function bodyText(): string {
  return document.body.textContent ?? ''
}

// ---- tests ------------------------------------------------------------------

describe('SectionedDropdown', () => {
  it('shows no section content while closed', async () => {
    await renderDropdown([makeSingle(), makeMulti()])

    expect(bodyText()).not.toContain('Alpha')
    expect(bodyText()).not.toContain('Bravo')
    expect(bodyText()).not.toContain('Xray')
  })

  it('opens via the trigger and shows a single section option labels', async () => {
    const hostBoxRef = await renderDropdown([makeSingle()])

    await open()

    const text = bodyText()
    expect(text).toContain('Alpha')
    expect(text).toContain('Bravo')
    expect(text).toContain('Charlie')
    expect(hostBoxRef.current?.openId).toBe(DROPDOWN_ID)
  })

  it('single-select pick calls onChange and closes by default (autoDismiss defaults true)', async () => {
    const section = makeSingle()
    const hostBoxRef = await renderDropdown([section])

    await open()
    pick('Bravo')

    expect(section.onChange).toHaveBeenCalledTimes(1)
    expect(section.onChange).toHaveBeenCalledWith('b')
    expect(hostBoxRef.current?.openId).toBeNull()
    expect(bodyText()).not.toContain('Bravo')
  })

  it('single-select pick does not close when autoDismiss is false', async () => {
    const section = makeSingle()
    const hostBoxRef = await renderDropdown([section], { autoDismiss: false })

    await open()
    pick('Bravo')

    expect(section.onChange).toHaveBeenCalledWith('b')
    expect(hostBoxRef.current?.openId).toBe(DROPDOWN_ID)
    expect(bodyText()).toContain('Bravo')
  })

  it('multi-select toggling an unselected option appends it, and never closes the popover', async () => {
    const section = makeMulti({ value: ['x'] })
    const hostBoxRef = await renderDropdown([section])

    await open()
    pick('Yankee')

    expect(section.onChange).toHaveBeenCalledTimes(1)
    expect(section.onChange).toHaveBeenCalledWith(['x', 'y'])
    expect(hostBoxRef.current?.openId).toBe(DROPDOWN_ID)
  })

  it('multi-select toggling an already-selected option removes it, and never closes even with autoDismiss true', async () => {
    const section = makeMulti({ value: ['x', 'y'] })
    const hostBoxRef = await renderDropdown([section], { autoDismiss: true })

    await open()
    pick('Xray')

    expect(section.onChange).toHaveBeenCalledTimes(1)
    expect(section.onChange).toHaveBeenCalledWith(['y'])
    expect(hostBoxRef.current?.openId).toBe(DROPDOWN_ID)
  })

  describe('takenValue', () => {
    it('keeps a taken option visible but disabled', async () => {
      const section = makeSingle({ takenValue: 'b' })
      await renderDropdown([section])

      await open()

      expect(bodyText()).toContain('Bravo')
      expect(rowProps('Bravo').disabled).toBe(true)
    })

    it('leaves every other option enabled and selectable', async () => {
      const section = makeSingle({ takenValue: 'b' })
      await renderDropdown([section])

      await open()
      pick('Charlie')

      expect(rowProps('Alpha').disabled).toBeFalsy()
      expect(section.onChange).toHaveBeenCalledWith('c')
    })
  })

  describe('allClear', () => {
    it('shows the "all" label when not everything is selected, and selecting all calls onChange with every value', async () => {
      const section = makeMulti({ value: ['x'], allClear: true })
      await renderDropdown([section])

      await open()

      expect(bodyText()).toContain('All')
      pick('All')

      expect(section.onChange).toHaveBeenCalledWith(['x', 'y', 'z'])
    })

    it('shows the "clear" label when everything is selected, and clearing calls onChange with []', async () => {
      const section = makeMulti({ value: ['x', 'y', 'z'], allClear: true })
      await renderDropdown([section])

      await open()

      expect(bodyText()).toContain('Clear')
      pick('Clear')

      expect(section.onChange).toHaveBeenCalledWith([])
    })

    it('respects custom allClearLabels', async () => {
      const section = makeMulti({ value: [], allClear: true })
      await renderDropdown([section], { allClearLabels: { all: 'Everything', clear: 'Nothing' } })

      await open()

      expect(bodyText()).toContain('Everything')
      expect(bodyText()).not.toContain('All')
    })
  })

  it('renders both a single and a multi section together, simultaneously', async () => {
    await renderDropdown([makeSingle(), makeMulti()])

    await open()

    const text = bodyText()
    expect(text).toContain('Alpha')
    expect(text).toContain('Charlie')
    expect(text).toContain('Xray')
    expect(text).toContain('Zulu')
  })

  describe('trigger icon fallback', () => {
    it('shows the selected option icon when there is exactly one single-select section', async () => {
      const section = makeSingle({
        options: [
          { value: 'a', label: 'Alpha', icon: 'star' },
          { value: 'b', label: 'Bravo', icon: 'heart' }
        ],
        value: 'b'
      })
      await renderDropdown([section])

      expect(triggerProps().icon).toBe('heart')
    })

    it('falls back to the static icon when there is more than one section', async () => {
      const single = makeSingle({
        options: [{ value: 'a', label: 'Alpha', icon: 'star' }],
        value: 'a'
      })
      await renderDropdown([single, makeMulti()], { icon: 'cog' })

      expect(triggerProps().icon).toBe('cog')
    })

    it('falls back to the static icon when a multi-select section is present alone', async () => {
      const multi = makeMulti({
        options: [{ value: 'x', label: 'Xray', icon: 'star' }],
        value: ['x']
      })
      await renderDropdown([multi], { icon: 'cog' })

      expect(triggerProps().icon).toBe('cog')
    })
  })

  it('derives onAccentColor via getColorRoles(accentColor, menuBg) when not supplied', async () => {
    await renderDropdown([makeSingle()], { accentColor: '#3366ff', dark: false })

    expect(getColorRoles).toHaveBeenCalledWith('#3366ff', '#FFFFFF')
  })

  it('does not call getColorRoles-derived color when onAccentColor is supplied explicitly, but still renders', async () => {
    await renderDropdown([makeSingle()], { onAccentColor: '#123456' })

    await open()

    expect(bodyText()).toContain('Alpha')
  })

  it('renders successfully with an explicit align override, regardless of the measured trigger rect', async () => {
    mockMeasureInWindow.mockImplementationOnce((cb) => cb(390, 850, 44, 44))
    await renderDropdown([makeSingle()], { align: 'left' })

    await open()

    expect(bodyText()).toContain('Alpha')
  })
})
