// Real @tastic/core's package.json "browser"/"react-native" export conditions point at its own
// raw .ts source (so bundlers can inline it, worklet directive and all) rather than the compiled
// dist — jsdom's default customExportConditions includes "browser", so plain resolution hands
// Jest that raw source, which ts-jest then refuses to transform (transformIgnorePatterns excludes
// node_modules by default). Mocked instead of fighting that config, since `clamp` is this trivial.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Real hook does live browser capability detection (touch points, coarse-pointer media query,
// narrow-width fallback) — none of which jsdom meaningfully reports, so it's stubbed to a plain
// jest.fn() a test can override per-case instead.
export const useIsTouchPrimaryDevice = jest.fn(() => true)
