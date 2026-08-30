import React, { useImperativeHandle } from 'react'

const noop = () => {}
const stub = ({ children }: { children?: React.ReactNode }) => children ?? null

export type MockMeasureInWindowCallback = (x: number, y: number, width: number, height: number) => void

// Default measurement for every `<View ref={...}>` in this mock — deterministic (not tied to any
// real layout, since jsdom never lays anything out) so useAutoAlign's math is reproducible without
// every test needing to override it. Override per-test via `mockMeasureInWindow.mockImplementationOnce(...)`
// (imported directly from this file, not through the 'react-native' module-name-mapper redirect,
// so TypeScript sees it — the real react-native types don't declare this export).
export const mockMeasureInWindow = jest.fn((cb: MockMeasureInWindowCallback) => cb(0, 0, 0, 0))

const StyleSheet = {
  create: <T extends object>(styles: T): T => styles,
  flatten: (style: unknown) => style,
  absoluteFill: {},
  hairlineWidth: 1
}

const mockListener = { remove: noop }

const Appearance = {
  getColorScheme: jest.fn(() => 'light' as 'light' | 'dark' | null),
  addChangeListener: jest.fn(() => mockListener)
}

const Platform = {
  OS: 'ios' as 'ios' | 'android' | 'web',
  select: <T extends Record<string, unknown>>(spec: T) => spec.ios ?? spec.default
}

export { Appearance, Platform, StyleSheet }
export const StatusBar = stub
// forwardRef, not a bare `jest.fn(stub)` like the others below — useAutoAlign (and everything
// built on it: PopoverBody's caller in SectionedDropdown/InlineColorPicker) measures its trigger
// via `triggerRef.current.measureInWindow(...)`, which only ever fires if a ref actually attaches.
// A plain function component silently drops a `ref` (React warns and leaves `.current` null),
// which would leave `measured` permanently false and every popover's content permanently
// unrenderable in tests — this is the one RN primitive in this package that's ever given a ref.
// The render function is still its own jest.fn (exported separately, since forwardRef's return
// value isn't itself callable/inspectable the way a plain jest.fn is) so tests can inspect a
// <View>'s props — e.g. its computed `style` — via `mockViewRender.mock.calls`, same as they
// already can for ScrollView/Pressable below.
export const mockViewRender = jest.fn((props: { children?: React.ReactNode } & Record<string, unknown>, ref: React.Ref<{ measureInWindow: typeof mockMeasureInWindow }>) => {
  useImperativeHandle(ref, () => ({ measureInWindow: mockMeasureInWindow }))
  return props.children ?? null
})
export const View = React.forwardRef(mockViewRender)
export const ScrollView = jest.fn(stub)
export const Pressable = jest.fn(stub)
export const useWindowDimensions = jest.fn(() => ({ width: 402, height: 874, scale: 3, fontScale: 1 }))
