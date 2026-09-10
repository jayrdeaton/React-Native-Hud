import type { ComponentType, ReactNode } from 'react'
import { useEffect, useState } from 'react'

export interface SkiaGateProps<P extends object> {
  // A dynamic import, e.g. `() => import('./Board')` — hoist to module scope at the call site
  // (never an inline closure written directly in JSX) so its identity stays stable across
  // renders; it's this component's own useEffect dependency below.
  getComponent: () => Promise<{ default: ComponentType<P> }>
  componentProps: P
  // Rendered while getComponent()'s promise is still pending. Defaults to null.
  fallback?: ReactNode
}

// Native Skia renders through JSI — no WASM/CanvasKit fetch to wait on — so this file just
// lazily mounts whatever getComponent() resolves to, once it resolves. The .web.tsx sibling
// (picked by Metro/webpack's own platform-extension resolution for web bundles) is a different
// implementation entirely: a direct re-export of @shopify/react-native-skia's own WithSkiaWeb,
// which gates the same mount behind LoadSkiaWeb() first — CanvasKit's WASM build has to actually
// finish loading before anything that imports '@shopify/react-native-skia' can evaluate its own
// top-level `Skia` binding without crashing (see loadSkiaWeb.web.ts's own comment).
//
// No React.lazy()/Suspense here, deliberately: lazy() can't be called inline during render
// (react-hooks/static-components — a getComponent prop that isn't referentially stable would
// give a new component identity, and therefore an unwanted remount, on every render that passes
// a fresh one) and can't be cached in a ref either (react-hooks/refs forbids reading or writing
// ref.current during render, only inside an effect). Awaiting the import directly and setting
// state from the resolved module sidesteps both — setState only ever runs from the promise
// callback, never synchronously in render or in the effect body itself.
export function SkiaGate<P extends object>({ getComponent, componentProps, fallback = null }: SkiaGateProps<P>) {
  const [Component, setComponent] = useState<ComponentType<P> | null>(null)

  useEffect(() => {
    let cancelled = false
    getComponent().then((mod) => {
      if (!cancelled) setComponent(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [getComponent])

  if (!Component) return fallback

  return <Component {...componentProps} />
}
