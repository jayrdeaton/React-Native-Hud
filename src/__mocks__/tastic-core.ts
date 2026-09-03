// Real @tastic/core's package.json "browser"/"react-native" export conditions point at its own
// raw .ts source (so bundlers can inline it, worklet directive and all) rather than the compiled
// dist — jsdom's default customExportConditions includes "browser", so plain resolution hands
// Jest that raw source, which ts-jest then refuses to transform (transformIgnorePatterns excludes
// node_modules by default). Mocked instead of fighting that config, since `clamp` is this trivial.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Same treatment as clamp above - trivial enough to just reimplement rather than fight the export-
// condition/transform mismatch.
export function computeContentBounds(windowWidth: number, maxContentWidth: number): { contentWidth: number; gutterWidth: number } {
  const contentWidth = clamp(windowWidth, 0, maxContentWidth)
  const gutterWidth = Math.max(0, (windowWidth - contentWidth) / 2)
  return { contentWidth, gutterWidth }
}

// Real hook does live browser capability detection (touch points, coarse-pointer media query,
// narrow-width fallback) — none of which jsdom meaningfully reports, so it's stubbed to a plain
// jest.fn() a test can override per-case instead.
export const useIsTouchPrimaryDevice = jest.fn(() => true)
