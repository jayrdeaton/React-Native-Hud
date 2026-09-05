import React from 'react'

export type SeedColor = { label: string; value: string }

// Real @rific/auto-paper ships exactly 20 (see its own source) — InlineColorPicker's column-count
// clamping (4x5 vs 5x4) is tuned specifically against that length, so the mock matches it rather
// than an arbitrary count.
export const defaultColors: SeedColor[] = Array.from({ length: 20 }, (_, i) => ({
  label: `Color ${i}`,
  value: `#${i.toString(16).padStart(6, '0')}`
}))

export const getContrastColor = jest.fn((_hex: string) => '#000000')
export const getBlendedColor = jest.fn((a: string, _b: string, _t: number) => a)
export const getColorRoles = jest.fn((_accent: string, _bg: string) => ({ onColor: '#ffffff' }))

// Only the color keys BaseSettingsDialog.tsx/ConfirmDialog.tsx actually read — real
// MD3Theme['colors'] carries many more, but a test double only needs to cover what's exercised,
// same reasoning as every other stub in this file.
export const useAutoPaperTheme = jest.fn(() => ({
  dark: false,
  colors: {
    danger: '#00000b',
    onDanger: '#00000c',
    onPrimary: '#000001',
    onSurface: '#000002',
    onSurfaceVariant: '#000003',
    primary: '#000004',
    secondary: '#000005',
    secondaryContainer: '#000006',
    onSecondary: '#00000a',
    surfaceVariant: '#000007',
    tertiary: '#000008',
    tertiaryContainer: '#000009'
  }
}))

// react-native-paper's real Dialog renders through a Portal (no jsdom modal host) — this stub keeps
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
