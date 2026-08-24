import { Platform } from 'react-native'

// Skia's web target renders through CanvasKit, a WASM build of Skia fetched at runtime — nothing
// using @shopify/react-native-skia's React components can draw a single frame until this resolves.
// Skia on native (via JSI) is ready as soon as the app's native module is linked, so this only
// actually does anything on web — a Platform.OS check rather than a `.web.ts` sibling file, since
// this package builds to a single bundled dist file (see package.json's `build` script): a bundler
// that pre-flattens the whole module graph itself (tsup/esbuild) never sees or swaps in a `.web.ts`
// variant the way a consuming app's own Metro bundler would, so the split has to be a runtime
// branch that survives being bundled, not a build-time file choice that wouldn't.
export function loadSkiaWeb(): Promise<void> {
  if (Platform.OS !== 'web') return Promise.resolve()
  return import('@shopify/react-native-skia/src/web').then((m) => m.LoadSkiaWeb())
}
