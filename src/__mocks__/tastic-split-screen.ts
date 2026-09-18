// Real @tastic/split-screen resolves (via its own "react-native" export condition, which jsdom's
// default customExportConditions also matches) to raw .ts source under node_modules, which ts-jest
// then refuses to transform (transformIgnorePatterns excludes node_modules by default) — same
// problem this package's own @tastic/core mock documents. Mocked to just useZoneBounds, the only
// export useZoneClampedAlign needs; defaults to null (the real hook's own "outside any zone" value)
// so a test only needs to override it, via mockReturnValueOnce/mockReturnValue, when it actually
// wants a zone present.
export const useZoneBounds = jest.fn(() => null)
