// Four entries: the full barrel (src/index.ts), a standalone Skia-loader bundle for ./skia, a standalone
// how-to-play bundle for ./guide, and a standalone fleet-chrome bundle for ./chrome - see package.json's
// "exports" and CLAUDE.md's "One way to load Skia" / "The guide subpath" / "The chrome subpath" for why
// each subpath needs its own build output rather than just being reachable through the barrel (the
// barrel's own peer-dependency surface is exactly what a lightweight consumer is trying to avoid).
// src/skia/index.ts, src/guide/index.ts and src/chrome/index.ts build to dist/skia/index.*,
// dist/guide/index.* and dist/chrome/index.* (esbuild keeps an entry's path relative to the common src/
// root).
module.exports = require('@infinitetoken/tsconfig/tsup/lib')(['src/index.ts', 'src/skia/index.ts', 'src/guide/index.ts', 'src/chrome/index.ts'])
