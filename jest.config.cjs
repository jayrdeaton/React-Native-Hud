module.exports = require('@infinitetoken/jest-config/react-native')({
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^react-native-paper$': '<rootDir>/src/__mocks__/react-native-paper.ts',
    // Real @rific/feedback-press requires expo-haptics/expo-audio at module scope (neither is a
    // dependency of this package) and reads __DEV__, which nothing in this jsdom config defines —
    // mocked wholesale, same as react-native/react-native-paper above, rather than pulling in a
    // native-only peer just to satisfy an import this package never actually exercises.
    '^@rific/feedback-press$': '<rootDir>/src/__mocks__/rific-feedback-press.ts',
    // Real @rific/auto-paper's barrel file also pulls in Dialog/ThemeProvider/react-native-safe-
    // area-context at module scope for components this package never imports — mocked to just the
    // color utilities actually used (getContrastColor, getBlendedColor, getColorRoles, defaultColors).
    '^@rific/auto-paper$': '<rootDir>/src/__mocks__/rific-auto-paper.ts',
    // Real reanimated's shared-value/worklet machinery has no jsdom equivalent (it's designed to
    // run off the JS thread) and its official mock is ESM, which this ts-jest-only config (no
    // babel-jest) can't transform — mocked with a synchronous stand-in instead (see that file).
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.ts',
    // Real Skia renders through native JSI (or WASM on web) — neither exists under jsdom, so
    // Canvas/Path/Skia are mocked to plain no-ops that still let TriggerGauge's own arc-math run
    // (see that mock for why this is enough to exercise the logic without an actual renderer).
    '^@shopify/react-native-skia$': '<rootDir>/src/__mocks__/rn-skia.ts',
    '^@shopify/react-native-skia/src/web$': '<rootDir>/src/__mocks__/rn-skia-web.ts',
    // Real @tastic/core resolves (via its own "browser" export condition, which jsdom's default
    // customExportConditions matches) to raw .ts source under node_modules, which ts-jest then
    // refuses to transform (transformIgnorePatterns excludes node_modules by default) — mocked
    // instead of loosening that project-wide default just for one two-line function.
    '^@tastic/core$': '<rootDir>/src/__mocks__/tastic-core.ts'
  },
  overrides: {
    // Every mock above is a `jest.fn(...)` — cleared (not restored/reset, since none use
    // mockImplementationOnce or need their base implementation replaced) before each test so one
    // test's calls/instances never leak into the next.
    clearMocks: true
  }
})
