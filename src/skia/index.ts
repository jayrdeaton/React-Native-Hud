// The Skia entry point (`@tastic/hud/skia`): the web CanvasKit loader every app's Skia host files use,
// and the wasm URL rule it applies, reachable without the main barrel. Several Skia apps lack the
// barrel's heavier peers (@tastic/profile, @tastic/split-screen), and importing `@tastic/hud` there
// fails to bundle, so this is the one import path every app's host files share.
//
// package.json points both "react-native" and "browser" at this file. That is fine because it has no
// .web twin itself: Metro doesn't platform-resolve an exports-map target, but it does resolve the
// relative imports below, so web bundles get loadSkiaWeb.web.ts and native ones the no-op. The
// boundary (only @shopify/react-native-skia's /src/web subpath, and only from the .web file) is
// enforced by src/__tests__/skiaImports.test.ts.
export { loadSkiaWeb } from '../loadSkiaWeb'
export { locateSkiaWebFile } from '../locateSkiaWebFile'
