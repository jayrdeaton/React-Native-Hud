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
