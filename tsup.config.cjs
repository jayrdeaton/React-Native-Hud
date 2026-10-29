// Five entries: the full barrel (src/index.ts), a standalone Skia-loader bundle for ./skia, a standalone
// how-to-play bundle for ./guide, a standalone fleet-chrome bundle for ./chrome and a standalone
// Skia-free loadout bundle for ./lobby - see package.json's "exports" and CLAUDE.md's "One way to load
// Skia" / "The guide subpath" / "The chrome subpath" / "The lobby subpath" for why each subpath needs
// its own build output rather than just being reachable through the barrel (the barrel's own
// peer-dependency surface is exactly what a lightweight consumer is trying to avoid).
// src/skia/index.ts, src/guide/index.ts, src/chrome/index.ts and src/lobby/index.ts build to
// dist/skia/index.*, dist/guide/index.*, dist/chrome/index.* and dist/lobby/index.* (esbuild keeps an
// entry's path relative to the common src/ root).
module.exports = require('@infinitetoken/tsconfig/tsup/lib')(['src/index.ts', 'src/skia/index.ts', 'src/guide/index.ts', 'src/chrome/index.ts', 'src/lobby/index.ts'])
