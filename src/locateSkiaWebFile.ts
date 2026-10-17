// The `locateFile` for CanvasKit's WASM fetch: `<baseUrl>/<file>`, so `/snake/canvaskit.wasm` under
// an Expo base URL of `/snake` and `/canvaskit.wasm` with none. That is where an Expo web export
// serves the app's `public/canvaskit.wasm`. Without a `locateFile`, canvaskit-wasm 0.41 resolves the
// file next to the running script, or next to the page when no script is running: at `/snake` (no
// trailing slash) that is `/canvaskit.wasm`, and in a static-output app it can land under
// `/_expo/static/js/web/`. LoadSkiaWeb also keeps its first load's promise, a failed one included,
// for the life of the page, so whichever call loads CanvasKit first has to pass this.
//
// `process.env.EXPO_BASE_URL` is `experiments.baseUrl` with its trailing slashes stripped ('' when
// unset). babel-preset-expo inlines it as a string literal in every file Metro transforms,
// node_modules included, so this source picks up the consuming app's value with no wiring. It is
// read at call time, so a test (where it isn't inlined) can set it. No Skia import, so the barrel and
// `@tastic/hud/skia` can export it to native too.
export function locateSkiaWebFile(file: string): string {
  return `${process.env.EXPO_BASE_URL ?? ''}/${file}`
}
