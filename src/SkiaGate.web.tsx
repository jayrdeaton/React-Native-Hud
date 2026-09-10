// Web needs CanvasKit's WASM loaded before any Skia <Canvas> evaluates — see loadSkiaWeb.web.ts's
// own comment for why a plain useEffect-based loader can't fix this (it's a module-evaluation-
// order problem, not a component-lifecycle one). Only this file (picked by Metro/webpack's
// platform-extension resolution for web bundles) may import from
// '@shopify/react-native-skia/src/web' — a static import of that subpath from a native-reachable
// file pulls canvaskit-wasm's `require('fs')` into the native bundle and breaks iOS/Android
// builds; this file vs. SkiaGate.tsx is what actually keeps it out, the same split
// loadSkiaWeb.web.ts/loadSkiaWeb.ts already use.
export { WithSkiaWeb as SkiaGate } from '@shopify/react-native-skia/src/web'
