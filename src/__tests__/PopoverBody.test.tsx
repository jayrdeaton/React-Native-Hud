import { render, screen } from '@testing-library/react'
import React from 'react'

import { mockViewRender } from '../__mocks__/react-native'
import { PopoverBody } from '../PopoverBody'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]

// Every <View> rendered anywhere in the tree, as its flattened style-entry list - the outer content
// View carries zIndex: 50 (styles.content), while either caret View carries zIndex: 1 (styles.caret),
// so callers can tell them apart without depending on call order.
const viewStyles = (): Record<string, unknown>[][] => (mockViewRender as jest.Mock).mock.calls.map((call) => flatten((call[0] as { style?: unknown }).style))

// The zero-height strip the box hangs off (styles.edge) carries zIndex: 50 too; it's the one with height: 0.
const isEdge = (entries: Record<string, unknown>[]): boolean => entries.some((e) => e.height === 0)

const contentStyle = (): Record<string, unknown>[] | undefined => viewStyles().find((entries) => entries.some((e) => e.zIndex === 50) && !isEdge(entries))

const edgeStyle = (): Record<string, unknown> => Object.assign({}, ...(viewStyles().find(isEdge) ?? []))

const caretStyles = (): Record<string, unknown>[][] => viewStyles().filter((entries) => entries.some((e) => e.zIndex === 1))

describe('PopoverBody', () => {
  it('renders nothing, and never mounts a View, when visible is false', () => {
    const { container } = render(
      <PopoverBody visible={false} align='center' verticalAlign='below'>
        PANEL_CONTENT
      </PopoverBody>
    )

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('PANEL_CONTENT')).toBeNull()
    expect(mockViewRender).not.toHaveBeenCalled()
  })

  it('renders children and no caret styling when visible with no caretColor', () => {
    render(
      <PopoverBody visible align='center' verticalAlign='below'>
        PANEL_CONTENT
      </PopoverBody>
    )

    expect(screen.getByText('PANEL_CONTENT')).toBeTruthy()
    expect(caretStyles()).toHaveLength(0)
    expect(contentStyle()).toBeDefined()
  })

  it('adds two caret Views and falls back the border-ring color to caretColor when caretBorderColor is omitted', () => {
    render(
      <PopoverBody visible caretColor='#abcdef' triggerSize={40}>
        PANEL_CONTENT
      </PopoverBody>
    )

    const carets = caretStyles()
    expect(carets).toHaveLength(2)
    expect(carets.some((entries) => entries.some((e) => e.borderBottomColor === '#abcdef'))).toBe(true)
  })

  it('uses caretBorderColor for the outer ring while the inner fill keeps caretColor, when both are given', () => {
    render(
      <PopoverBody visible caretColor='#111111' caretBorderColor='#222222' triggerSize={40}>
        PANEL_CONTENT
      </PopoverBody>
    )

    const carets = caretStyles()
    expect(carets.some((entries) => entries.some((e) => e.borderBottomColor === '#222222'))).toBe(true)
    expect(carets.some((entries) => entries.some((e) => e.borderBottomColor === '#111111'))).toBe(true)
  })

  it("points the caret's fill at borderBottomColor for the default verticalAlign ('below')", () => {
    render(
      <PopoverBody visible caretColor='#abcdef' triggerSize={40}>
        PANEL_CONTENT
      </PopoverBody>
    )

    const carets = caretStyles()
    expect(carets.some((entries) => entries.some((e) => 'borderBottomColor' in e))).toBe(true)
    expect(carets.some((entries) => entries.some((e) => 'borderTopColor' in e))).toBe(false)
  })

  it("points the caret's fill at borderTopColor when verticalAlign is 'above'", () => {
    render(
      <PopoverBody visible verticalAlign='above' caretColor='#abcdef' triggerSize={40}>
        PANEL_CONTENT
      </PopoverBody>
    )

    const carets = caretStyles()
    expect(carets.some((entries) => entries.some((e) => 'borderTopColor' in e))).toBe(true)
    expect(carets.some((entries) => entries.some((e) => 'borderBottomColor' in e))).toBe(false)
  })

  it("aligns the content box flush left ({left: 0}, no right/center) for align 'left'", () => {
    render(
      <PopoverBody visible align='left'>
        PANEL_CONTENT
      </PopoverBody>
    )

    const entries = contentStyle()
    expect(entries).toBeDefined()
    expect(entries?.some((e) => e.left === 0)).toBe(true)
    expect(entries?.some((e) => e.right === 0)).toBe(false)
    expect(entries?.some((e) => e.alignItems === 'center')).toBe(false)
  })

  it("aligns the content box flush right ({right: 0}, no left/center) for align 'right'", () => {
    render(
      <PopoverBody visible align='right'>
        PANEL_CONTENT
      </PopoverBody>
    )

    const entries = contentStyle()
    expect(entries).toBeDefined()
    expect(entries?.some((e) => e.right === 0)).toBe(true)
    expect(entries?.some((e) => e.left === 0)).toBe(false)
    expect(entries?.some((e) => e.alignItems === 'center')).toBe(false)
  })

  it("stretches and centers the content box ({left: 0, right: 0, alignItems: 'center'}) for the default align ('center')", () => {
    render(<PopoverBody visible>PANEL_CONTENT</PopoverBody>)

    const entries = contentStyle()
    expect(entries).toBeDefined()
    expect(entries?.some((e) => e.left === 0)).toBe(true)
    expect(entries?.some((e) => e.right === 0)).toBe(true)
    expect(entries?.some((e) => e.alignItems === 'center')).toBe(true)
  })

  it('offsets the caret horizontally by triggerSize/2 - halfFootprint on the left edge for a non-right align', () => {
    // ringSize = CARET_SIZE (7) + caretBorderWidth (default 1) = 8; triggerSize/2 - ringSize = 20 - 8 = 12
    render(
      <PopoverBody visible align='center' caretColor='#abcdef' triggerSize={40}>
        PANEL_CONTENT
      </PopoverBody>
    )

    const carets = caretStyles()
    expect(carets.some((entries) => entries.some((e) => e.left === 12))).toBe(true)
    // No caret entry should carry a `right` offset when align isn't 'right'.
    expect(carets.some((entries) => entries.some((e) => e.right !== undefined))).toBe(false)
  })

  // React Native's Yoga errata resolve an absolute child's percentage insets against the space its parent was offered, a whole multi-line
  // row in a wrapping one, so a menu in the first line opened a row too low on native: the box hangs off a zero-height strip pinned with
  // plain insets instead.
  it('hangs the box below the trigger off a strip pinned to its bottom edge, with no percentage inset', () => {
    render(
      <PopoverBody visible caretColor='#abcdef' triggerSize={40} verticalAlign='below'>
        PANEL_CONTENT
      </PopoverBody>
    )

    expect(edgeStyle()).toMatchObject({ position: 'absolute', height: 0, left: 0, right: 0, bottom: 0 })
    expect(edgeStyle().top).toBeUndefined()
    expect(Object.assign({}, ...contentStyle()!)).toMatchObject({ position: 'absolute', top: 0, marginTop: 8 })
    const values = viewStyles().flatMap((entries) => entries.flatMap((e) => Object.values(e)))
    expect(values.filter((v) => typeof v === 'string' && v.endsWith('%'))).toEqual([])
  })

  it('hangs the box above the trigger off a strip pinned to its top edge', () => {
    render(
      <PopoverBody visible caretColor='#abcdef' triggerSize={40} verticalAlign='above'>
        PANEL_CONTENT
      </PopoverBody>
    )

    expect(edgeStyle()).toMatchObject({ position: 'absolute', height: 0, left: 0, right: 0, top: 0 })
    expect(edgeStyle().bottom).toBeUndefined()
    expect(Object.assign({}, ...contentStyle()!)).toMatchObject({ position: 'absolute', bottom: 0, marginBottom: 8 })
  })
})
