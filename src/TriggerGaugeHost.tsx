import { lazy, Suspense } from 'react'

import { loadSkiaWeb } from './loadSkiaWeb'
import type { TriggerGaugeProps } from './TriggerGauge'

// TriggerGauge.tsx imports @shopify/react-native-skia at its top level, and this file is reached from
// the main barrel, so a static import here would evaluate Skia the moment any app imports
// `@tastic/hud`. On web that binds Skia to a CanvasKit that hasn't loaded yet (its `Skia` object is
// built from global.CanvasKit at module-evaluation time), and in every app's Jest run it throws
// ("Native Skia Module failed to correctly install JSI Bindings!": no app mocks Skia). So the gauge
// module is only imported when a gauge mounts, behind loadSkiaWeb(), which loads CanvasKit on web and
// resolves at once on native. This is the web half of the fleet's Skia host pair (see the README's
// "Skia on web"), used on both platforms here: an app's own native host file can import its Skia
// component directly, but a package barrel can't. The lazy component is created once, at module
// scope, so its identity never changes between renders.
const LazyTriggerGauge = lazy(() => loadSkiaWeb().then(() => import('./TriggerGauge').then((mod) => ({ default: mod.TriggerGauge }))))

export default function TriggerGaugeHost(props: TriggerGaugeProps) {
  return (
    <Suspense fallback={null}>
      <LazyTriggerGauge {...props} />
    </Suspense>
  )
}
