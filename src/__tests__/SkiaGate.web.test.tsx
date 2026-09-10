import { WithSkiaWeb } from '@shopify/react-native-skia/src/web'

import { SkiaGate } from '../SkiaGate.web'

// SkiaGate.web.tsx has no logic of its own — it's a straight re-export of the real WithSkiaWeb
// (see that file's own comment for why this exists as a separate platform file at all). Its own
// lazy-loading behavior is Shopify's to test, not re-verified here — this just proves the wiring.
describe('SkiaGate.web', () => {
  it('is the real WithSkiaWeb', () => {
    expect(SkiaGate).toBe(WithSkiaWeb)
  })
})
