import * as barrel from '../index'
import { locateSkiaWebFile } from '../locateSkiaWebFile'
import * as skiaEntry from '../skia'

// In an app, babel-preset-expo inlines process.env.EXPO_BASE_URL as a literal (it skips that under
// NODE_ENV=test), so these tests set the real env var instead - locateSkiaWebFile reads it at call
// time, not at module load.
describe('locateSkiaWebFile', () => {
  const original = process.env.EXPO_BASE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_BASE_URL
    else process.env.EXPO_BASE_URL = original
  })

  it('puts the file at the site root when there is no base URL', () => {
    delete process.env.EXPO_BASE_URL
    expect(locateSkiaWebFile('canvaskit.wasm')).toBe('/canvaskit.wasm')
  })

  it("puts the file at the site root for an empty base URL (Expo's value when experiments.baseUrl is unset)", () => {
    process.env.EXPO_BASE_URL = ''
    expect(locateSkiaWebFile('canvaskit.wasm')).toBe('/canvaskit.wasm')
  })

  it('puts the file under the base URL', () => {
    process.env.EXPO_BASE_URL = '/snake'
    expect(locateSkiaWebFile('canvaskit.wasm')).toBe('/snake/canvaskit.wasm')
  })

  it('ignores the script-directory prefix canvaskit passes as a second argument', () => {
    process.env.EXPO_BASE_URL = '/snake'
    const locateFile = locateSkiaWebFile as (file: string, prefix: string) => string
    expect(locateFile('canvaskit.wasm', '/_expo/static/js/web/')).toBe('/snake/canvaskit.wasm')
  })

  it('is exported from the barrel and from @tastic/hud/skia, next to loadSkiaWeb', () => {
    expect(barrel.locateSkiaWebFile).toBe(locateSkiaWebFile)
    expect(skiaEntry.locateSkiaWebFile).toBe(locateSkiaWebFile)
    expect(skiaEntry.loadSkiaWeb).toBe(barrel.loadSkiaWeb)
  })
})
