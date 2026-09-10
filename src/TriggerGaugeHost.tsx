import { SkiaGate } from './SkiaGate'
import { TriggerGaugeProps } from './TriggerGauge'

// TriggerGauge.tsx's `Skia` import binds to global.CanvasKit at module-evaluation time, which on web
// only exists once CanvasKit's WASM fetch resolves — a plain `import { TriggerGauge } from
// './TriggerGauge'` at the top of this file would already have evaluated that binding, against a
// not-yet-loaded, undefined CanvasKit, before anything in a consuming app renders at all, since
// bundlers evaluate the whole static import graph up front. This file therefore never imports
// TriggerGauge itself except as a type (erased at compile time, carrying no runtime module
// reference) — getTriggerGauge below, hoisted to module scope so its identity stays stable across
// renders (see SkiaGate's own comment on why that matters), is what actually defers the real import
// to runtime. No explicit loadSkiaWeb() call here on web: SkiaGate.web.tsx (WithSkiaWeb) already
// gates its own mount behind CanvasKit being ready, and on native there's nothing to wait on at all.
const getTriggerGauge = () => import('./TriggerGauge').then((mod) => ({ default: mod.TriggerGauge }))

export default function TriggerGaugeHost(props: TriggerGaugeProps) {
  return <SkiaGate getComponent={getTriggerGauge} componentProps={props} />
}
