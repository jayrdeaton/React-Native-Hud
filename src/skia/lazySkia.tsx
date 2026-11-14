import { type ComponentType, lazy, Suspense } from 'react'

import { loadSkiaWeb } from '../loadSkiaWeb'

// A Skia component for the web (an app's BoardHost.web.tsx, the web half of the host pair: see the
// README's "Skia on web"). Skia's web target renders through CanvasKit, a WASM build of Skia, and a
// component's own `Skia` import binds to `global.CanvasKit` once, synchronously, at module-evaluation
// time (see @shopify/react-native-skia's Skia.web.ts: `export const Skia = JsiSkApi(global.CanvasKit)`)
// - not lazily, and not reactively. A plain import of the component would evaluate that binding against
// a not-yet-loaded, undefined CanvasKit before anything renders, since Metro evaluates the whole static
// import graph up front. A dynamic import is the one thing that defers module evaluation to runtime, so
// the component's module (and Skia with it) is only imported once loadSkiaWeb() has resolved and set
// global.CanvasKit for real. On native there's nothing to defer (JSI is ready before any JS runs), so an
// app's BoardHost.tsx just re-exports its component, which then draws on the first frame.
//
// Call it once, at module scope (`export default lazySkia(...)`), so the lazy component is created once:
// called during a render it would be a new component type every time, remounting the Skia component.
export function lazySkia<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  const LazySkiaComponent = lazy(() => loadSkiaWeb().then(load))
  return function SkiaHost(props: P) {
    return (
      <Suspense fallback={null}>
        <LazySkiaComponent {...props} />
      </Suspense>
    )
  }
}
