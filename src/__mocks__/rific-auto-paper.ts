import React from 'react'

export type SeedColor = { label: string; value: string }

// Real @rific/auto-paper ships exactly 20 (see its own source) - InlineColorPicker's column-count
// clamping (4x5 vs 5x4) is tuned specifically against that length, so the mock matches it rather
// than an arbitrary count.
export const defaultColors: SeedColor[] = Array.from({ length: 20 }, (_, i) => ({
  label: `Color ${i}`,
  value: `#${i.toString(16).padStart(6, '0')}`
}))

export const getContrastColor = jest.fn((_hex: string) => '#000000')
export const getBlendedColor = jest.fn((a: string, _b: string, _t: number) => a)
export const getColorRoles = jest.fn((_accent: string, _bg: string) => ({ onColor: '#ffffff' }))

// Only the color keys BaseSettingsDialog.tsx/ConfirmDialog.tsx actually read - real
// MD3Theme['colors'] carries many more, but a test double only needs to cover what's exercised,
// same reasoning as every other stub in this file.
export const useAutoPaperTheme = jest.fn(() => ({
  dark: false,
  // OverlayCard rounds its corners like auto-paper's Dialog: 7 x roundness on an MD3 theme.
  isV3: true,
  roundness: 4,
  colors: {
    danger: '#00000b',
    onDanger: '#00000c',
    onPrimary: '#000001',
    onSurface: '#000002',
    onSurfaceVariant: '#000003',
    outlineVariant: '#00000d',
    backdrop: '#00000e',
    primary: '#000004',
    secondary: '#000005',
    secondaryContainer: '#000006',
    onSecondary: '#00000a',
    surfaceVariant: '#000007',
    tertiary: '#000008',
    tertiaryContainer: '#000009'
  }
}))

// react-native-paper's real Dialog renders through a Portal (no jsdom modal host) - this stub keeps
// BaseSettingsDialog's own conditional (`visible`) so tests can assert the dialog's presence/absence
// like the real thing would render it, without an actual Portal/Modal underneath.
export const Dialog = Object.assign(
  jest.fn(({ visible, children }: { visible: boolean; children?: React.ReactNode }) => (visible ? children : null)),
  {
    Title: jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null),
    ScrollArea: jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)
  }
)

export const AutoAppearancePicker = jest.fn(() => null)

// FadingScrollView (BaseSettingsDialog's rows) is a pass-through to the react-native mock's ScrollView, so
// tests keep reading the rows off ScrollView.mock.calls.
export const FadingScrollView = jest.fn((props: { children?: React.ReactNode; [key: string]: unknown }) => {
  const { ScrollView } = jest.requireActual('./react-native')
  return React.createElement(ScrollView, props, props.children)
})

// OverlayCard renders on BlurView; the mock is a plain View so tests can find the card and its children.
export const BlurView = jest.fn(({ children, style, ...rest }: { children?: React.ReactNode; style?: unknown; [key: string]: unknown }) => {
  const { View } = jest.requireActual('react-native')
  return React.createElement(View, { style, ...rest }, children)
})

// BaseSettingsDialog's Blur row reads and writes auto-paper's own theme settings, and only shows when
// an expo-blur module was handed to auto-paper (useBlurModule). Defaults: blur on, no module, which
// real auto-paper reports as undefined (its BlurModuleContext default), never null.
export const useThemeSettings = jest.fn(() => ({ settings: { appearance: 'system', blur: true, blurTint: 0.2, color: '#000004', harmony: 'split-complementary' }, set: jest.fn() }))
export const useBlurModule = jest.fn((): unknown => undefined)
// OverlayCard reads the player's Blur setting through this, the same hook auto-paper's Dialog uses.
export const useBlur = jest.fn((override?: boolean) => override ?? true)
