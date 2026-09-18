import { act, render, screen } from '@testing-library/react'
import Animated from 'react-native-reanimated'

import { mockViewRender } from '../__mocks__/react-native'
import { getStaggeredWordDuration, StaggeredWord, StaggeredWordProps } from '../StaggeredWord'

const STAGGER_MS = 45
const LETTER_DURATION_MS = 320

const baseProps: StaggeredWordProps = {
  word: 'AB',
  color: '#112233',
  fontFamily: 'Menlo',
  fontSize: 40,
  lineHeight: 48,
  reducedMotion: false
}

// The mock's own doc (react-native-reanimated.ts) says as much: it resolves every animation
// synchronously, so a plain re-render is enough to observe the settled end state — the initial
// render still captures the pre-effect (opacity 0) frame, since useEffect fires only after that
// first commit. Re-rendering with the exact same props forces a second pass that reads the
// by-then-mutated shared value.
function renderSettled(overrides: Partial<StaggeredWordProps> = {}) {
  const props = { ...baseProps, ...overrides }
  const result = render(<StaggeredWord {...props} />)
  // Drop the pre-effect (opacity 0) render's own Animated.Text calls — only the rerender below,
  // taken after the mount effect has already mutated every letter's shared value, reflects the
  // settled state these tests actually care about.
  ;(Animated.Text as jest.Mock).mockClear()
  act(() => result.rerender(<StaggeredWord {...props} />))
  return result
}

function letterCalls() {
  return (Animated.Text as jest.Mock).mock.calls.map((c) => c[0] as { children: string; style: unknown[] })
}

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

describe('getStaggeredWordDuration', () => {
  it("matches every consuming app's own (letterCount - 1) * STAGGER_MS + LETTER_DURATION_MS formula", () => {
    expect(getStaggeredWordDuration(1)).toBe(LETTER_DURATION_MS)
    expect(getStaggeredWordDuration(5)).toBe(4 * STAGGER_MS + LETTER_DURATION_MS)
    expect(getStaggeredWordDuration(9)).toBe(8 * STAGGER_MS + LETTER_DURATION_MS)
  })
})

describe('StaggeredWord', () => {
  it('renders one letter per character, in order', () => {
    renderSettled({ word: 'CAT' })

    const calls = letterCalls()
    expect(calls.map((c) => c.children)).toEqual(['C', 'A', 'T'])
  })

  it('threads color/fontFamily/fontSize/lineHeight into every letter', () => {
    renderSettled({ word: 'HI', color: '#ff00aa', fontFamily: 'Courier', fontSize: 22, lineHeight: 30 })

    for (const call of letterCalls()) {
      const flat = Object.assign({}, ...flatten(call.style))
      expect(flat).toEqual(expect.objectContaining({ color: '#ff00aa', fontFamily: 'Courier', fontSize: 22, lineHeight: 30 }))
    }
  })

  it('defaults fontWeight to bold and leaves letterSpacing unset', () => {
    renderSettled({ word: 'X' })

    const flat = Object.assign({}, ...flatten(letterCalls()[0].style))
    expect(flat.fontWeight).toBe('bold')
    expect(flat.letterSpacing).toBeUndefined()
  })

  it('lets a caller override fontWeight and set letterSpacing', () => {
    renderSettled({ word: 'X', fontWeight: 'normal', letterSpacing: 4 })

    const flat = Object.assign({}, ...flatten(letterCalls()[0].style))
    expect(flat.fontWeight).toBe('normal')
    expect(flat.letterSpacing).toBe(4)
  })

  it('settles every letter to full opacity and its resting transform once mounted (or immediately under reducedMotion)', () => {
    renderSettled({ word: 'HI', reducedMotion: false })

    for (const call of letterCalls()) {
      const flat = Object.assign({}, ...flatten(call.style))
      expect(flat.opacity).toBe(1)
      expect(flat.transform).toEqual([{ translateY: 0 }, { scale: 1 }])
    }
  })

  it('renders already fully settled on the very first render when reducedMotion is true (no stagger to observe)', () => {
    // No rerender-to-settle here on purpose — reducedMotion skips the animated effect entirely
    // (see AnimatedLetter's own guard clause), so the very first render already reads progress===1.
    render(<StaggeredWord {...baseProps} reducedMotion />)

    for (const call of letterCalls()) {
      const flat = Object.assign({}, ...flatten(call.style))
      expect(flat.opacity).toBe(1)
    }
  })

  it("offsets each letter's stagger index by startIndex, for a multi-word wordmark sharing one sequence", () => {
    // Both words render identically settled under this mock regardless of startIndex (see
    // react-native-reanimated.ts's own doc: withDelay ignores its delay and resolves immediately)
    // — what this test actually protects is that a non-zero startIndex doesn't change which
    // characters render or throw, since real timing behavior isn't observable through this mock.
    renderSettled({ word: 'CD', startIndex: 2 })

    expect(letterCalls().map((c) => c.children)).toEqual(['C', 'D'])
  })

  it('applies the wrapping style prop and forwards onLayout to the row View', () => {
    const onLayout = jest.fn()
    renderSettled({ style: { marginTop: 9 }, onLayout })

    const rowCall = (mockViewRender as jest.Mock).mock.calls.find((c) => flatten((c[0] as { style?: unknown }).style).some((o) => o.flexDirection === 'row'))
    expect(rowCall).toBeDefined()
    const rowProps = rowCall![0] as { style?: unknown; onLayout?: unknown }
    expect(flatten(rowProps.style)).toEqual(expect.arrayContaining([expect.objectContaining({ marginTop: 9 })]))
    expect(rowProps.onLayout).toBe(onLayout)
  })

  it('renders nothing for an empty word', () => {
    renderSettled({ word: '' })
    expect(letterCalls()).toHaveLength(0)
    expect(screen.queryByText(/./)).toBeNull()
  })
})
