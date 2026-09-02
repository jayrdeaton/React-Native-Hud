import { TouchableRipple } from '@rific/feedback-press'
import { act, render, screen } from '@testing-library/react'
import { Icon } from 'react-native-paper'

import { getLabeledDropdownContentHeight, LABELED_DROPDOWN_POPOVER_WIDTH, LabeledDropdown, LabeledDropdownOption } from '../LabeledDropdown'
import { PopoverBody } from '../PopoverBody'
import { PopoverHost, usePopoverHost } from '../usePopoverHost'

// Locally mocked (unlike every other popover component's test in this package) so this file can
// assert on exactly which align/verticalAlign/maxHeight/measured values LabeledDropdown hands off
// — PopoverBody's own mapping of those into actual position styling is PopoverBody's own test's
// job (see PopoverBody.test.tsx), not this component's.
jest.mock('../PopoverBody', () => ({
  PopoverBody: jest.fn(({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null))
}))

type Difficulty = 'easy' | 'hard'

const OPTIONS: LabeledDropdownOption<Difficulty>[] = [
  { value: 'easy', label: 'Easy', icon: 'emoticon-happy-outline' },
  { value: 'hard', label: 'Hard' }
]

interface HostBox {
  host: PopoverHost | null
}

interface HarnessProps {
  onHost: (host: PopoverHost) => void
  id?: string
  value: Difficulty
  onChange: (value: Difficulty) => void
  align?: 'left' | 'right' | 'center'
  alignOverride?: Parameters<typeof LabeledDropdown<Difficulty>>[0]['alignOverride']
}

function Harness({ onHost, id = 'difficulty', ...rest }: HarnessProps) {
  const host = usePopoverHost()
  onHost(host)
  return <LabeledDropdown id={id} host={host} options={OPTIONS} color='#ff00ff' dark={false} {...rest} />
}

function newHostBox(): HostBox {
  return { host: null }
}

function openTrigger() {
  act(() => (TouchableRipple as jest.Mock).mock.calls[0][0].onPress())
}

function lastPopoverBodyProps() {
  const calls = (PopoverBody as jest.Mock).mock.calls
  return calls[calls.length - 1][0]
}

describe('LabeledDropdown', () => {
  it('shows the selected option label, uppercased, on the trigger', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value='easy'
        onChange={jest.fn()}
      />
    )

    expect(screen.getByText('EASY')).toBeTruthy()
  })

  it('opens on trigger press and closes+calls onChange when a row is selected', () => {
    const hostBox = newHostBox()
    const onChange = jest.fn()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value='easy'
        onChange={onChange}
      />
    )

    openTrigger()
    expect(hostBox.host?.openId).toBe('difficulty')

    // The last (options.length + 1) TouchableRipple calls are one full render pass in JSX order:
    // the trigger first, then each option row in array order.
    const calls = (TouchableRipple as jest.Mock).mock.calls.map((c) => c[0])
    const [, easyRow, hardRow] = calls.slice(-(OPTIONS.length + 1))

    act(() => hardRow.onPress())
    expect(onChange).toHaveBeenCalledWith('hard')
    expect(hostBox.host?.openId).toBeNull()
    void easyRow
  })

  it('renders an icon only for options that declare one', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value='easy'
        onChange={jest.fn()}
      />
    )

    openTrigger()

    // 'menu-down' is the trigger's own chevron, rendered on every render pass (including ones
    // before/independent of opening) — excluded here since this test is only about the row icons.
    const rowIconSources = (Icon as jest.Mock).mock.calls.map((c) => c[0].source).filter((s) => s !== 'menu-down')
    // Only Easy's row declares an icon; Hard's row renders no Icon at all, on every render pass.
    expect(new Set(rowIconSources)).toEqual(new Set(['emoticon-happy-outline']))
  })

  it('uses its own useAutoAlign result when alignOverride is omitted', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value='easy'
        onChange={jest.fn()}
      />
    )

    openTrigger()

    // The mock's default measureInWindow reports the trigger at (0,0) with zero size — against a
    // 180px-wide popover that overflows the left edge from there, useAutoAlign's own math (see that
    // hook's own test/doc) picks 'left', not 'center'; this is exercising the real hook, not a
    // stubbed one, so this asserts its actual output rather than an idealized one.
    const props = lastPopoverBodyProps()
    expect(props.align).toBe('left')
    expect(props.verticalAlign).toBe('below')
    expect(props.visible).toBe(true)
  })

  it('substitutes a caller-supplied alignOverride wholesale instead of its own useAutoAlign result', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value='easy'
        onChange={jest.fn()}
        alignOverride={{ align: 'right', verticalAlign: 'above', maxHeight: 123, measured: true, triggerRef: { current: null } }}
      />
    )

    openTrigger()

    const props = lastPopoverBodyProps()
    expect(props.align).toBe('right')
    expect(props.verticalAlign).toBe('above')
    expect(props.visible).toBe(true)
  })

  it('the align prop forces horizontal alignment even when alignOverride supplies its own', () => {
    const hostBox = newHostBox()
    render(
      <Harness
        onHost={(h) => {
          hostBox.host = h
        }}
        value='easy'
        onChange={jest.fn()}
        align='left'
        alignOverride={{ align: 'right', verticalAlign: 'above', maxHeight: 123, measured: true, triggerRef: { current: null } }}
      />
    )

    openTrigger()

    expect(lastPopoverBodyProps().align).toBe('left')
  })
})

describe('getLabeledDropdownContentHeight', () => {
  it("matches the padding + per-row height a caller would need to replicate this popover's own sizing", () => {
    // LABELED_DROPDOWN_POPOVER_WIDTH pairs with this for a caller computing an external alignment
    // hook's own contentWidth/contentHeight args to match this component's internal ones exactly.
    expect(LABELED_DROPDOWN_POPOVER_WIDTH).toBe(180)
    expect(getLabeledDropdownContentHeight(OPTIONS.length)).toBe(8 * 2 + OPTIONS.length * 36)
    expect(getLabeledDropdownContentHeight(0)).toBe(16)
  })
})
