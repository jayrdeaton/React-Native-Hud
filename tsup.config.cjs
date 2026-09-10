// Two entries: the full barrel (src/index.ts) plus a standalone SkiaGate bundle for the
// ./skia-gate subpath export — see package.json's "exports" and CLAUDE.md's "Why SkiaGate exists"
// for why that needs its own build output rather than just being reachable through the barrel.
module.exports = require('@infinitetoken/tsconfig/tsup/lib')(['src/index.ts', 'src/SkiaGate.tsx'])
