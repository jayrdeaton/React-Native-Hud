import { lazy, Suspense } from 'react'

import { loadSkiaWeb } from './loadSkiaWeb'
import { TriggerGaugeProps } from './TriggerGauge'

// TriggerGauge.tsx's `Skia` import binds to global.CanvasKit at module-evaluation time, which on web
// only exists once loadSkiaWeb()'s WASM fetch resolves (see that file's own comment) — a plain
// `import { TriggerGauge } from './TriggerGauge'` at the top of this file would already have
// evaluated that binding, against a not-yet-loaded, undefined CanvasKit, before anything in a
// consuming app renders at all, since bundlers evaluate the whole static import graph up front. This
// file therefore never imports TriggerGauge itself except as a type (erased at compile time,
// carrying no runtime module reference) — `lazy()` is what actually defers the real import to
// runtime, after loadSkiaWeb() resolves. Always lazy, on every platform, rather than a native/web
// branch here: this package builds to a single bundled dist file (see loadSkiaWeb's own comment on
// why), so there's no reliable build-time way to give native a plain, non-lazy passthrough instead —
// loadSkiaWeb() itself already resolves immediately on native, so the Suspense boundary there just
// clears on the next tick, not a perceptible delay. The Suspense fallback renders nothing, so a
// consumer's trigger icon still shows immediately and the gauge ring just pops in a beat later.
const LazyTriggerGauge = lazy(() => loadSkiaWeb().then(() => import('./TriggerGauge').then((m) => ({ default: m.TriggerGauge }))))

export default function TriggerGaugeHost(props: TriggerGaugeProps) {
  return (
    <Suspense fallback={null}>
      <LazyTriggerGauge {...props} />
    </Suspense>
  )
}
