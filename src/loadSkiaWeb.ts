// Native counterpart to loadSkiaWeb.web.ts — Skia on native (via JSI, no WASM) is ready as soon as
// the app's native module is linked, so there's nothing to actually wait on here. This file must
// never import '@shopify/react-native-skia/src/web' (even conditionally behind a Platform.OS check):
// that module pulls in canvaskit-wasm, which does `require('fs')` — a runtime check doesn't stop
// Metro from statically resolving that import to build the native bundle graph, and Metro has no
// `fs` for iOS/Android, so the build fails outright. Metro's own platform-extension resolution (this
// file vs. loadSkiaWeb.web.ts) is what actually keeps the web-only module out of the native graph.
export function loadSkiaWeb(): Promise<void> {
  return Promise.resolve()
}
