import { LoadSkiaWeb } from '@shopify/react-native-skia/src/web'

import { locateSkiaWebFile } from './locateSkiaWebFile'

// Skia's web target renders through CanvasKit, a WASM build of Skia fetched at runtime - nothing
// using @shopify/react-native-skia's React components can draw a single frame until this resolves.
// Kept as a thin wrapper (rather than importing LoadSkiaWeb directly at call sites) so this file's
// `.ts` counterpart, loadSkiaWeb.ts, gives native an identically-shaped async no-op - Metro's
// platform-extension resolution picks whichever one matches the bundle target, so canvaskit-wasm's
// `require('fs')` never even gets resolved into a native/iOS/Android bundle - and so the wasm is
// always fetched from the app's base URL (see locateSkiaWebFile.ts).
export function loadSkiaWeb(): Promise<void> {
  return LoadSkiaWeb({ locateFile: locateSkiaWebFile })
}
