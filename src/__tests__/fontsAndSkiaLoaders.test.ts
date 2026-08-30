import { LoadSkiaWeb } from '@shopify/react-native-skia/src/web'

import { MONO_FONT } from '../fonts'
import { loadSkiaWeb } from '../loadSkiaWeb'
import { loadSkiaWeb as loadSkiaWebForWeb } from '../loadSkiaWeb.web'

describe('MONO_FONT', () => {
  it('resolves to Menlo under the mocked ios Platform.select', () => {
    expect(MONO_FONT).toBe('Menlo')
  })
})

describe('loadSkiaWeb (native no-op)', () => {
  it('resolves to undefined without touching the web Skia loader', async () => {
    await expect(loadSkiaWeb()).resolves.toBeUndefined()
    expect(LoadSkiaWeb).not.toHaveBeenCalled()
  })
})

describe('loadSkiaWeb.web (web wrapper)', () => {
  it('delegates to LoadSkiaWeb and resolves', async () => {
    await expect(loadSkiaWebForWeb()).resolves.toBeUndefined()
    expect(LoadSkiaWeb).toHaveBeenCalledTimes(1)
  })
})
