# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

# @tastic/hud

Visual component kit for local-multiplayer React Native games: inline (non-modal) popovers,
dropdowns, color pickers, gauges, ready buttons, and dialogs - built so a control scoped to one
player's own zone never blocks the rest of the screen, which is what lets two players configure
their own settings on one shared device at the same time.

Part of the `@tastic` package ecosystem - game-specific UI, as opposed to `@rific`'s generic React
Native tooling. Published (public) at https://www.npmjs.com/package/@tastic/hud - `package.json` has
no `"private"` field and `publishConfig.access` is `"public"`; the registry currently has `0.1.0`
through `0.1.5`, matching this repo's current version and `v0.1.5` git tag. Sibling package:
`@tastic/split-screen` (`../React-Native-Split-Screen`), the two-player layout/orientation engine
this kit's components are designed to render correctly inside (in particular, `PopoverBody`'s
positioning survives an ancestor's 180° rotation). Neither package depends on the other - they
compose at the consuming app's own screen.

## Commands

```bash
npm run lint      # ESLint (includes Prettier via eslint-plugin-prettier) check
npm run fix       # Auto-fix lint/format issues
npm run typecheck # TypeScript type check (tsc --noEmit)
npm test          # Run all Jest tests (with coverage)
npm run build     # Compile to dist/ via tsup
npm run verify    # lint && test && typecheck && build - the full gate, also run by CI and by `preversion`
```

Always run `npm run lint` before finishing any task.

## Release

Version bumps, tagging, and pushing are handled by dedicated npm scripts - never run `npm version`
directly:

```bash
npm run release:patch   # npm version patch && npm run release
npm run release:minor   # npm version minor && npm run release
npm run release:major   # npm version major && npm run release
```

`npm run release` itself is just `git push --follow-tags`. `preversion` runs `npm run verify` first,
so a bump can't proceed with a broken lint/test/typecheck/build. The `Publish` GitHub Actions
workflow (`.github/workflows/publish.yml`) fires on `v*` tags and calls the fleet's shared
`infinitetoken/Workflows/.github/workflows/npm-publish.yml@v1`, which runs `npm publish` with
provenance. `.github/workflows/ci.yml` calls the shared `npm-ci.yml@v1` workflow on every PR and push
to `main`.

### Local development (yalc)

For consuming apps that want changes before a real release, linked via yalc rather than the
registry:

```bash
npm run build && yalc publish   # from this package
cd ../your-game && yalc add @tastic/hud && npm install
```

Re-run `npm run build && yalc push` after any change to propagate it to every linked consumer.

## Architecture

### Source files (`src/`)

| File | Purpose |
|---|---|
| `usePopoverHost.ts` | `{openId, toggle, close}` - tracks which one popover is open within a group. One instance per independent editor (e.g. one per player's panel) so opening a popover in one group never affects another. |
| `PopoverBody.tsx` | Low-level popover shell: position (`align`/`verticalAlign`), the connecting caret triangle. Rendered inline as an absolutely-positioned sibling of its trigger - never via Portal - so it inherits any rotation transform the trigger's zone applies. |
| `useAutoAlign.ts` | Measures a trigger's actual on-screen position via `measureInWindow` (resolves post-transform - rotation-safe) and picks whichever `align`/`verticalAlign` keeps a popover of a given size from overflowing a screen edge. Also returns `maxHeight`, the room available in whichever direction it picked, for the caller to cap content and scroll instead of overflowing when neither direction has enough room. |
| `SectionedDropdown.tsx` | Popover holding any mix of single-select ("pick one", radio-style) and multi-select ("pick some", checkbox-style, optional all/clear footer) sections, divided by rules. Covers a plain single-value picker, a multi-select toggle list, or a combined menu (e.g. frequency + which types) - all the same component. Its trigger renders a `TriggerGaugeHost` ring showing every section's current state at a glance, without opening the menu. |
| `ControlSchemePicker.tsx` | A `SectionedDropdown` opinionated for one job: picking which physical input (a keyboard layout - the raw layouts themselves live in `@tastic/input`, this repo has no opinion on which exist - or something else entirely, e.g. "keep using pointer input") drives a local seat in a couch-multiplayer game. Fixes the trigger icon/accessibility label and, the actual reason it's its own component rather than a usage snippet, bakes in the `Platform.OS === 'web' && !useIsTouchPrimaryDevice()` gate every consumer was independently re-deriving - renders `null` outside that (a physical-key scheme has no meaning on native or a touch-primary device), so it's safe to mount unconditionally inside a caller's own per-seat layout. Generic over `T`, same as `SectionedDropdown`'s own `MenuOption<T>` - a caller always supplies its own `options`. |
| `InlineColorPicker.tsx` | Swatch-grid color popover. Auto-computes column count from screen width (4-5 columns - clamped to whichever fills a complete row of `defaultColors`' 20 swatches). Supports a "taken" color shown disabled or swappable. |
| `TriggerGauge.tsx` | Skia-drawn (`Canvas`/`Path`/`Skia`) decorative ring of animated (`react-native-reanimated`) tick marks around a trigger, showing which option(s) are active without opening the popover. Pure presentational, no popover/host coupling. Not exported directly - see `TriggerGaugeHost` and Public API below. |
| `TriggerGaugeHost.tsx` | The only supported way to render a trigger gauge. A module-scope `React.lazy` that awaits `loadSkiaWeb()` (a no-op on native) and then imports `TriggerGauge.tsx`, inside a `Suspense`, so Skia is only evaluated once a gauge mounts: never when an app imports the barrel (real Skia throws at import in every app's Jest run, and no app mocks it) and never before CanvasKit has loaded on web. It's the web half of the fleet's Skia host pair, used on both platforms (see "One way to load Skia" below). Default export, re-exported as a named export from `index.ts`. |
| `loadSkiaWeb.ts` | Native counterpart to `loadSkiaWeb.web.ts` - resolves immediately, since Skia-on-native (JSI, no WASM) needs nothing awaited. Must never import `@shopify/react-native-skia/src/web`, even conditionally - see the file's own comment on why Metro would still pull `canvaskit-wasm`'s `require('fs')` into the native bundle graph. Exported from the barrel and from `@tastic/hud/skia`; every app's `.web.tsx` Skia host awaits it (see "One way to load Skia" below). |
| `loadSkiaWeb.web.ts` | Web counterpart - thin wrapper around `@shopify/react-native-skia`'s own `LoadSkiaWeb` (imported from its `/src/web` subpath), which fetches the CanvasKit WASM build Skia's web target renders through, called with `{ locateFile: locateSkiaWebFile }`. Metro's platform-extension resolution (this file vs. `loadSkiaWeb.ts`) is what keeps this out of the native bundle. |
| `locateSkiaWebFile.ts` | `locateSkiaWebFile(file)`: `${process.env.EXPO_BASE_URL ?? ''}/${file}`, the `locateFile` `loadSkiaWeb.web.ts` hands CanvasKit. No imports, so it's exported from the barrel and from `@tastic/hud/skia`, for code that calls Skia's own `LoadSkiaWeb` or `WithSkiaWeb`. See "Skia's wasm comes from the base URL" below. |
| `skia/index.ts` | The `@tastic/hud/skia` entry: `loadSkiaWeb` and `locateSkiaWebFile`, with none of the barrel's peers, so every app's Skia host files can import from it. See "One way to load Skia" below. |
| `ReadyButton.tsx` | Per-player or standalone ready toggle - outlined until ready, then fills solid with the player's own color. |
| `PressAwayOverlay.tsx` | Invisible full-bleed `Pressable` for press-away-to-close. Rendered as an early sibling of real content so paint order keeps every real control directly tappable; only genuinely empty space falls through to it. |
| `fonts.ts` | `MONO_FONT` - the system-monospace default every component's `labelFontFamily` prop falls back to. |
| `index.ts` | Public export barrel - see Public API below. |

### One way to load Skia: the host pair and `@tastic/hud/skia` (2026-10-17)

`SkiaGate` was extracted in 2026-09 from hand-copied `SkiaGate.tsx`/`SkiaGate.web.tsx` pairs in seven apps
(ArcheryDuel, Asteroids, RampantRats, Ember-Vein, HexFleet, FreeRide, HowBig), with its own `./skia-gate`
subpath so apps without the barrel's peers could reach it. By 2026-10-17 the fleet still loaded Skia on web
four ways: the host pair below (LightCycles, BoxHockey, Pong, AirHockey), `SkiaGate` (the seven above plus
Minesweeper and OttosOrchard), Shopify's `WithSkiaWeb` in a platform pair (Snake, Mancala), and a private
copy of `loadSkiaWeb` (Swirlio). Jay picked one, the host pair, and **`SkiaGate` and `./skia-gate` were
removed** (breaking).

- **The host pair**, two files per Skia component (code in the README's "Skia on web"): `BoardHost.tsx`
  renders the Skia component directly; `BoardHost.web.tsx` is a module-scope
  `lazy(() => loadSkiaWeb().then(() => import('./Board')))` inside a `Suspense`. Why it won over
  `SkiaGate`: native draws on the first frame (`SkiaGate`'s native side mounted through a dynamic import
  and a state update, so every `SkiaGate` app had a blank first render on native for nothing); the lazy
  component sits at module scope by construction (`SkiaGate` remounted whenever a caller forgot to hoist
  `getComponent`); and every app goes through hud's one loader, so one cached load and one place for the
  base-URL rule. The pair can't move into hud: rendering on the first frame on native needs a static
  import of the app's own component, which only the app can write.
- **`TriggerGaugeHost` stays lazy on native.** It uses the web half on both platforms (`loadSkiaWeb()` is a
  no-op on native). A static import would evaluate Skia whenever an app imports the barrel, and real Skia
  throws at import under Jest ("Native Skia Module failed to correctly install JSI Bindings!"), checked
  2026-10-17 by requiring it inside Snake's jest-expo setup. No app mocks Skia, so every app suite that
  imports `@tastic/hud` would fail. The same applies to an app's own native host: a test that imports it
  imports Skia.
- **`@tastic/hud/skia`** (`src/skia/index.ts`, its own tsup entry) exports `loadSkiaWeb` and
  `locateSkiaWebFile` with none of the barrel's peers: Ember-Vein, FreeRide, HowBig, Mancala, RampantRats
  and Swirlio lack `@tastic/profile` and/or `@tastic/split-screen`, so importing `@tastic/hud` there fails
  to bundle ("Unable to resolve module"). Both are also still in the barrel, but every app's host files
  import from `@tastic/hud/skia`, so the files match across the fleet. `src/__tests__/skiaImports.test.ts`
  walks the entry's imports (both platform files) and fails if it reaches anything but
  `loadSkiaWeb.ts`/`.web.ts` and `locateSkiaWebFile.ts`, or imports any package except
  `@shopify/react-native-skia/src/web` from the `.web` file.
- **Exports-map gotcha (from `./skia-gate`):** Metro does not platform-resolve an exports-map target.
  `./skia` points `"react-native"` and `"browser"` at the same `src/skia/index.ts`, which is fine only
  because that file has no `.web` twin: the split happens one relative import down, which Metro does
  resolve per platform (the same way the main barrel reaches `loadSkiaWeb.web.ts`). An extensionless
  target fails to resolve at all, and pointing `"browser"` at a file whose twin holds the web code
  bundles fine and then fails in the browser (`./skia-gate` shipped that briefly: `ReferenceError:
  CanvasKit is not defined` at the first mount). Grepping a bundle for `canvaskit` proves nothing (any
  Skia import mentions it); the only real check is a web export clicked through in a browser.
- **Rollout:** apps on `^0.23.0` don't take the removal until they bump (a 0.x caret stops at the next
  minor). Each app that still uses `SkiaGate` or `WithSkiaWeb` moves to the host pair when it takes this
  release: ArcheryDuel, Asteroids, Ember-Vein, FreeRide, HexFleet, HowBig, Minesweeper, OttosOrchard,
  RampantRats, Snake, Mancala and Swirlio (Swirlio also drops its own `loadSkiaWeb` copy). The four
  host-pair games only switch their import to `@tastic/hud/skia`. Molkky has no web loader at all and is
  out of scope (Jay, 2026-10-17).
- Removed with it: `SkiaGate.tsx`, `SkiaGate.web.tsx`, their two test files, the barrel's `SkiaGate`/
  `SkiaGateProps` exports and the mock `WithSkiaWeb`.

### Skia's wasm comes from the base URL (2026-10-17)

The web games are moving from `<game>.infinitetoken.com` to `games.infinitetoken.com/<game>/`, built
with Expo's `experiments.baseUrl` (set only for web builds). An export serves the app's
`public/canvaskit.wasm` at `<baseUrl>/canvaskit.wasm`, but hud's web loaders called `LoadSkiaWeb` with
no `locateFile`, so canvaskit-wasm 0.41 looked for the file next to the running script, or next to the
page when none was running: `/canvaskit.wasm` from `/snake` (no trailing slash), and under
`/_expo/static/js/web/` in a static-output app. `LoadSkiaWeb` keeps its first promise, a failed one
included, so a wrong URL broke every Skia view on the page until a reload.

- **`locateSkiaWebFile(file: string): string`** (`src/locateSkiaWebFile.ts`) returns
  `${process.env.EXPO_BASE_URL ?? ''}/${file}`. `loadSkiaWeb.web.ts` passes it
  (`LoadSkiaWeb({ locateFile })`), so `TriggerGaugeHost` and every app host that calls `loadSkiaWeb()`
  gets it with no change. With no base URL it's `/canvaskit.wasm`, the same file the site root fetched
  before.
- **Exported** from the barrel and from `@tastic/hud/skia`, for code that calls Skia's own `LoadSkiaWeb`
  or renders `WithSkiaWeb`: `opts={{ locateFile: locateSkiaWebFile }}`. Such code needs it even when
  hud's loader also runs: `LoadSkiaWeb`'s cached promise is per module instance, and Snake and Mancala
  import `lib/module/web` while hud imports `src/web`, two instances that share only
  `global.CanvasKit`. Jay confirmed the name on 2026-10-17.
- **`process.env.EXPO_BASE_URL` is inlined in node_modules too.** babel-preset-expo 58
  (`build/configs/expo.js`, `getInlinesFromOptions`) adds it to the `define-plugin` inlines, and that
  plugin runs on every file; only `warn-on-deep-rn-imports` is limited to first-party paths
  (`EXCLUDED_FIRST_PARTY_PATHS`). `@expo/metro-config`'s babel-transformer fills the caller's
  `baseUrl` from `customTransformOptions.baseUrl` ('' when absent), and Expo CLI's
  `getBaseUrlFromExpoConfig` strips trailing slashes, so the template never doubles a slash. The
  opt-in `unstable_noxcturnalTransformWorker` path inlines it as well (`noxcturnal/plugins/define.js`).
  Checked by running Snake's own babel-transformer on this template under a
  `node_modules/@tastic/hud/src/` filename: `"/snake"` with `baseUrl: '/snake'`, `""` without. It is
  not inlined when the bundler runs with `NODE_ENV=test`, which is why the function reads it at call
  time and the tests set the env var.
- **Not checked live:** no game has been exported or run in a browser with this build (they're on the
  published hud).
- Tests: `locateSkiaWebFile.test.ts` (no base URL, `''`, `/snake`, canvaskit's second `prefix`
  argument ignored, the same function from the barrel and `@tastic/hud/skia`) and
  `fontsAndSkiaLoaders.test.ts` (`LoadSkiaWeb` called with `{ locateFile: locateSkiaWebFile }`).

### `getInlineColorPickerContentSize` (2026-09-18)

(Superseded for `PlayerSetupPanel` on 2026-10-17: its seat button places its own dropdown, `cpuDifficultyAlignOverride` is gone, and `colorAlignOverride`/`colorRotation` only reach the fallback swatch. See "PlayerSetupPanel's seat button" below.)

A fleet-wide drift scan found that `PlayerSetupPanel`'s existing `colorAlignOverride` prop (forwarded straight into `InlineColorPicker`'s own `alignOverride`, exactly the same plumbing `cpuDifficultyAlignOverride` already had for the CPU-difficulty dropdown) was never actually wired up by any of the 5 consuming apps - a real bug, not a documentation gap, since the color picker (unlike the CPU-difficulty picker, a confirmed no-op everywhere) genuinely renders inside a live `@tastic/split-screen` zone in every app's two-human-player mode. The missing piece was a way for a caller to compute the popover's own content size ahead of render, the same job `LabeledDropdown`'s `getLabeledDropdownContentHeight` already does for that picker - `InlineColorPicker` had no equivalent export, just an internal computation.

Added `getInlineColorPickerContentSize(swatchCount, windowWidth, columns?): { width, height }`, exported alongside `InlineColorPicker`. Unlike `getLabeledDropdownContentHeight` (which only depends on a static option count), this one also takes `windowWidth` explicitly - the picker's own auto-column clamp depends on window width, and a caller computing this ahead of the picker's own mount has no component instance to read `useWindowDimensions()` from. `InlineColorPicker`'s own internal computation now calls this same function (removed the duplicated inline formula), so there's exactly one place this math lives. Now `0.9.1` (patch, no breaking change - this is a new export only; no app was wired to use it as part of this fix, see each app's own CLAUDE.md for that follow-up).

### `useZoneClampedAlign` rotation threading (2026-09-18)

`useZoneClampedAlign` gained a `rotation: PopoverRotation = 0` fourth parameter, threaded straight into its internal `useAutoAlign` call - low-risk, since it only ever reaches `useAutoAlign`'s own already-rotation-aware horizontal-align decision (verbatim, via the `if (!zone) return auto` fallback whenever the hook is used outside a zone). `PlayerSetupPanel` gained a matching `colorRotation?: PopoverRotation` prop, forwarded to its internal `InlineColorPicker`'s own `rotation` prop.

While threading it, the hook's own doc comment was found to be actively wrong - it claimed `measureInWindow` "resolves post-transform," the same false claim `useAutoAlign.ts` itself already documents as having shipped one real, unnoticed bug (measureInWindow reports the PRE-transform frame). The comment was rewritten to correct that and to honestly document a real, currently-unfixed gap this hook still has: it never applies `useAutoAlign`'s own `rotateRect(...)` correction to its raw `measureInWindow` read, so `awayRoom`/`towardRoom` are computed from the uncorrected frame. A full fix would also need `@tastic/split-screen`'s `DualZoneLayout.measureShared` corrected in tandem (`sharedEdgeY` has the identical gap) - `zone.rotated` alone isn't sufficient to fix just this hook's half, since it captures a trigger's own net rotation, not the outer ambient rotation `sharedEdgeY`'s own correction would need, and the two don't compose simply. Deliberately left unfixed rather than guessing at unverified trigonometry across a third package: confirmed every real `cpuDifficultyAlignOverride` call site across the fleet is a no-op today (never actually rendering inside a live `DualZoneLayout` zone), so nothing currently miscalculates in practice - but this needs real rotated-zone test coverage before either hook's math under live rotation is trustworthy.

### `useQuitConfirmation` (2026-09-18)

New hook, `src/useQuitConfirmation.ts`, capturing the `onBackPress` + `<ConfirmDialog>` "Quit
Match?" pattern every fleet `game.tsx` already hand-wired (Snake, AirHockey, BoxHockey, Pong,
LightCycles): interrupt backing out of a match with a confirmation only when there's progress worth
losing, otherwise back out immediately. Returns `{ confirmVisible, requestBack, cancelBack }` -
wire `confirmVisible`/`cancelBack` straight to `<ConfirmDialog visible={...} onCancel={...}>`,
`requestBack` to the back button's `onPress`. Deliberately does not own or render the
`<ConfirmDialog>` itself - title/message/icon/confirmLabel/cancelLabel/rotation stay authored at
each call site (a score pairing in most apps, a `<RoundHistoryPips>` component in LightCycles),
matching this package's established "hooks return data, JSX stays at the call site" convention
(`usePopoverHost`, `useAutoAlign`, `useZoneClampedAlign` all do the same). Exported, with its
`QuitConfirmation` type, from `src/index.ts`; covered by `src/__tests__/useQuitConfirmation.test.ts`.

**The signature is `hasProgress: () => boolean`, a lazy getter - not the plain `boolean` the
original design called for - and that's a real, load-bearing correction made after initial
implementation, not a stylistic choice.** The version of this hook worked out before implementation
took `hasProgress: boolean`, computed fresh by the caller on every render, exactly like each app's
own pre-extraction `onBackPress` closure already did. That looked safe until it was actually wired
into AirHockey, BoxHockey, and Pong - all three fold this hook's own `confirmVisible` into a
`paused = settingsOpen || confirmVisible` that gates `useGameState(paused)`, and `useGameState`'s
*return value* (scores, lives, bricks) is exactly what each app's `hasProgress` expression needs to
read. A plain-boolean argument forces that read to happen before `useGameState` has run on that
render: `confirmVisible → paused → useGameState(paused) → {scores/lives/bricks} → hasProgress →
confirmVisible` - a genuine circular render dependency, not just an ordering inconvenience. All
three apps hit this independently and worked around it with their own bespoke one-commit-behind
shadow state (reading last render's scores instead of the current one), converging on the same fix
under three different names - which was itself the signal that the hook's *contract* was wrong, not
that three call sites each needed their own patch.

The fix: `hasProgress` became a lazy `() => boolean` getter, and both it and `onConfirmedBack` are
mirrored into refs via this fleet's standard effect-based idiom - `useRef` seeded once, then kept
current by a bare `useEffect(() => { ref.current = value })` with **no dependency array** (runs
after every commit, not just on mount) rather than a render-time assignment, the same convention
`@rific/core`'s `createSettingsContext.tsx` uses for the same reason. `requestBack` reads
`hasProgressRef.current()` at tap time, not at the render that defined it, which defers the read
past the point where `useGameState`'s own output actually exists - exactly mirroring how the
original hand-rolled version in every app read scores/bricks/lives fresh from its own `onBackPress`
closure rather than needing the value threaded in earlier. This also gives `requestBack`/
`cancelBack` a stable identity across every render (empty deps on both `useCallback`s), which the
plain-boolean version couldn't offer - a changing `hasProgress` value would have forced
`requestBack`'s own deps array to include it, producing a new function identity on every render
where progress state changed.

Snake and LightCycles never had this circular dependency (their `hasProgress` expressions don't
route through a `paused`-gated `useGameState`), so for them the lazy-getter signature is a no-op
wrapper around the same expression they'd otherwise have passed directly. The correction exists for
AirHockey/BoxHockey/Pong's shape specifically, but the signature is uniform across all 5 call sites:
there's no partial/conditional API here, and there shouldn't be one: a caller with no circular
dependency today can still acquire one later (a refactor that moves score state behind the same
`paused` gate), and the lazy-getter signature costs nothing for the apps that don't currently need
it.

### `AchievementCatalogSection` + `ActivityStatSection` (2026-09-18)

Two new presentational components landing the achievements-scaffolding extraction, paired with
`@tastic/achievements`'s own new `catalogRows.ts` (`AchievementCatalogRow`,
`getAchievementCatalogRows`, `defaultFormatUnlockedLabel`) added in the same pass. The split mirrors
this package's existing `AchievementRow` (hud, presentational, fully-precomputed props) /
`achievementEngine.ts`-shaped (achievements, pure data) boundary - `@tastic/achievements` is
headless by design (its own CLAUDE.md: "nothing here renders," zero react-native/Paper peer deps),
so the row-computation logic reading `ACHIEVEMENT_CATALOG`/`unlockedAchievements`/stats lives there,
and the two components that actually render the result live here.

- **`AchievementCatalogSection.tsx`** - the "ALL ACHIEVEMENTS" `labelMedium` heading (`MONO_FONT`,
  `letterSpacing: 2`) plus one `<AchievementRow>` per `AchievementCatalogRow` in `rows`. Extracted
  byte-for-byte from every fleet app's own `achievements.tsx` (Snake, AirHockey, BoxHockey, Pong,
  LightCycles). Returns a `Fragment`, not a `View` - every call site rendered the heading and rows
  as flat siblings inside `BaseStatsScreen`'s own gap-spaced `ScrollView` content, and a wrapping
  container here would double up that spacing. Resolves each row's locked-vs-unlocked `badgeColor`
  here (`row.tierColor` when `row.unlockedAt !== undefined`, else `LOCKED_BADGE_COLOR`) rather than
  upstream, matching `AchievementRow`'s own "badge color is a rendering decision" doc comment -
  `@tastic/achievements`'s `getAchievementCatalogRows` deliberately leaves `tierColor` unresolved
  for the same reason.
- **`ActivityStatSection.tsx`** - the "ACTIVITY" `<StatSection>` (Days Played / Day Streak / Best
  Day Streak), also extracted byte-for-byte from the same 5 apps. Takes a plain structural
  `ActivityStats { distinctDaysPlayed, currentDayStreak, bestDayStreak }` interface, deliberately
  *not* `@tastic/achievements`'s own `DayStreakState` type even though the shapes match - this
  component has zero dependency, not even type-only, on `@tastic/achievements`; any caller's own
  stats object satisfying the structural shape works. This is the asymmetric half of the split:
  unlike `AchievementCatalogSection`, nothing here needed the sibling package at all.

**Verified against current source, not the original design doc: `AchievementCatalogRow` is a real
type-only import today, not a locally-duplicated one.** The design worked out before
`@tastic/achievements` had shipped `catalogRows.ts` anticipated `AchievementCatalogSection` briefly
carrying its own local copy of the `AchievementCatalogRow` interface as a stopgap until the sibling
package caught up. That stopgap is not what's in the repo now - `AchievementCatalogSection.tsx`
line 2 is `import type { AchievementCatalogRow } from '@tastic/achievements'`, and the file's own
comment (lines 10-13) records that the shapes were checked against each other before this real
dependency was wired in: "no longer duplicated locally now that package has actually published the
export (confirmed the two shapes match exactly before wiring this real, type-only peer
dependency)." `@tastic/achievements` is now a declared `peerDependency` here (`>=0.2.0`, the first release exporting `AchievementCatalogRow` - see Peer
Dependencies below), the first (and so far only) dependency this package takes on
`@tastic/achievements`, and it's type-only: no value import, no runtime coupling. It's currently
resolved via yalc (`file:.yalc/@tastic/achievements` in `devDependencies`) rather than a real
npm-published version, matching this repo's own "Local development (yalc)" flow documented above,
ahead of `@tastic/achievements` cutting a real release.

Both components are exported from `src/index.ts`'s barrel and covered by their own test files
(`src/__tests__/AchievementCatalogSection.test.tsx`, `src/__tests__/ActivityStatSection.test.tsx`).

### `AchievementUnlockList` (2026-09-25)

The newly-unlocked rows on a game-over / round-over card, extracted from 5 per-app copies (Snake's
`GameOverDialog`, LightCycles' `MatchOverDialog`, Pong's/AirHockey's/BoxHockey's `game.tsx`). The
copies agreed on the badge (tier color, 18px circle, black icon) and title, but had drifted to three
owner markers: `ProfileChip`-or-color-avatar (Pong, AirHockey), a color circle with the profile tag
(LightCycles), a trailing YOU/OPPONENT label (Snake), and none at all (BoxHockey). Jay chose to
converge on the first. `tierColors` is a required prop rather than a default read from
`ACHIEVEMENT_TIER_COLORS`, so `@tastic/achievements` stays type-only here (see below). The guest
avatar's icon uses `getContrastColor(color)`, where Pong/AirHockey used the theme's on-color; same
result for their theme primary/secondary colors in practice. Snake's 2 Player game-over card was
checked in a browser (guest seats, bronze unlocks, no console errors); the other four were not.

### `CornerActionButtons` takes an opt-in `hitSlop` (2026-10-15)

Each corner's touch target is its 40pt box (size 24 plus Paper's 8pt padding; Paper's 6pt margin
and the 8pt corner offset sit outside it). The optional `hitSlop` prop (`number | Insets`) goes to
both buttons' own `hitSlop` unchanged; the `style` (corner offset) is the same with or without it,
which the test checks. Hangman passes 4 for 48pt targets, matching the 4pt slop its drawer headers'
IconButtons use.

**It only works with `@rific/feedback-press` 0.13.0 or later.** Paper's IconButton clips its touchable
to the 40pt box (a Surface with `overflow: 'hidden'`), and RN's native hit testing never reaches past a
clipping parent, so a `hitSlop` handed to Paper was always a no-op on device (Paper's own default slop
too). feedback-press 0.13.0's IconButton wraps the Paper button in an invisible Pressable that owns the
slop, with nothing drawn and no layout change; see feedback-press's CLAUDE.md for the mechanism and why it
isn't a style override. The peer floor here stays at `>=0.10.2`: on an older feedback-press the prop is
silently ignored rather than breaking anything. react-native-web ignores `hitSlop` entirely, so on web the
target stays 40pt.

**Jay chose opt-in (2026-10-15): one optional prop covering both corners, not a built-in slop on every
game.** That cuts against the guide's "uniform by construction" rule (below), so don't turn it into a
default without asking him. Omitting it keeps the 40pt target the other games have. Whoever passes it
owns the clearance: in Hangman the Difficulty and Hint pills sit 8pt from the button boxes, so a 4pt
slop leaves a 4pt gap, though the Hint pill's own `hitSlop={8}` already reaches into it. Where the two
slops overlap (4pt, only when the pill row fills the width), the corner button wins because Main.tsx draws the corners
above the game.

### Overlay cards follow the theme and the Blur setting (2026-10-15)

`src/OverlaySurface.tsx` is the card every overlay draws: `OverlayBackdrop` (the full-screen dim),
`OverlayCard` (the card) and `useOverlayCardColors()` (`fg`, `fgMuted`, `cardBorder`, `backdrop`).
`ConfirmDialog` and `HowToPlayDialog` use them, and the games' own result cards are meant to.

**Jay's calls (2026-10-15):** tint the cards upstream for everyone instead of per app, make the card
the theme's raised surface (MD3 elevation 3), and "I'd like blur to be a setting available in all modes,
if not blur then surface color, automatically, across the fleet". So:

- Colors are theme roles, never literals: `onSurface`, `onSurfaceVariant`, `outlineVariant`, and the
  theme's `backdrop` (auto-paper's Dialog scrim) instead of the old solid `rgba(0,0,0,0.72)`.
- The card is auto-paper's `BlurView` with `blur={useBlur()}` (and, until the "One family of dialogs"
  change below, `elevation={3}`). **`BlurView` does not
  read the setting itself**: its `blur` prop defaults to true, and auto-paper's Dialog and Menu each call
  `useBlur()` and pass it in. Without the explicit prop the Settings toggle would never reach the card
  (caught before release; `OverlaySurface.test.tsx` now checks `blur: false` gets through). When blur
  can't happen, `BlurView` paints the raised surface on its own: Android with no `blurTarget`, an app
  that never passed `expoBlur` to auto-paper's Provider, or Blur off. `overflow: 'hidden'` keeps a
  native blur inside the rounded corners.
- `BaseSettingsDialog` has a Blur row in APPEARANCE (under `AutoAppearancePicker`) that flips
  auto-paper's own `blur` theme setting through `useThemeSettings().set`, so it persists wherever the
  app persists auto-paper's settings. It shows only where blur can happen: not on Android, not when
  `useBlurModule()` returns undefined (the app never passed `expoBlur` to auto-paper's Provider; the
  mock uses undefined too, since real auto-paper never returns null), and not with `hideAppearance`.
  No prop turns it off; it's uniform. Every game passes `expoBlur` since 2026-10-15 (Hangman and Snake
  already did; Pong, AirHockey, BoxHockey, LightCycles and Solitaire added `expo-blur`, which needs a
  new native build before it does anything on a device).
- `getOverlayCardColors(dark)` and its `OverlayCardColors` type are deleted (2026-10-15). Solitaire's
  win and loss banners and the five arcade games' own result cards (Pong, AirHockey, BoxHockey,
  LightCycles, Snake) moved onto `OverlayBackdrop`/`OverlayCard`/`useOverlayCardColors` with hud
  ^0.17.0 first, so nothing in the fleet called it any more. An app still on it can't take the next hud.
- The file is `OverlaySurface.tsx`, not `OverlayCard.tsx`. The two files could sit side by side (their
  extensions differ), but the import specifiers `./OverlayCard` and `./overlayCard` differ only in case,
  and on macOS's case-insensitive filesystem a resolver that tries `.ts` before `.tsx` (tsc, Metro,
  chromeImports.test.ts) finds `overlayCard.ts` for both. Linux CI would resolve them correctly, so the
  bug would only show on a Mac.
- `HowToPlayDialog.test.tsx` flattens the card's style before matching: `OverlayCard` nests the caller's
  style array inside its own, and the RN mock's `StyleSheet.flatten` is the identity.

### One family of dialogs (2026-10-15)

Jay: "they should all have the same title and maybe an icon, and the buttons should have the same
treatment... I value consistency above all else". Prompted by Solitaire, where the win/loss/New Game
cards read as a different shade from the Settings sheet. So:

- **The card is the Settings sheet's surface.** `OverlayCard` dropped `elevation={3}` (MD3's 11% wash
  of the primary, which next to auto-paper's untinted `Dialog` read as a different shade; Jay preferred
  the sheet), its border (`overlayStyles.card` has no `borderWidth` any more, so `cardBorder` is unused
  by hud itself) and its 20pt radius: it takes the Dialog's `(isV3 ? 7 : 1) * roundness` (28 at MD3's
  default) from the theme. `overlayStyles.card` padding went 32 -> 24, the sheet's own inset.
- **`DialogHeader` (src/DialogHeader.tsx)** is the one header: icon 64 over `headlineLarge` bold, both in
  `color ?? primary`, centered; `compact` puts a 32pt icon beside a `headlineSmall` title. The guide
  borrows the file, so it imports only `react-native`, `react-native-paper` and `@rific/auto-paper`
  (asserted in `guideImports.test.ts`). `isCompactDialogHeight`/`COMPACT_DIALOG_HEIGHT` (528 = the
  guide's old "480 usable inside 24pt gutters") is the one compact rule.
- **`useCompactDialog(rotation)` (src/useCompactDialog.ts)** needs `@tastic/core`, so it lives apart from
  the header (the guide can't import it; it computes compact in `getGuideCardSize`). It measures the
  `OverlayBackdrop` (`onLayout`, new prop), which fills whatever the dialog lays out in, and reads it
  along the card's own axis (width for a card turned +/-90). Before the first layout it guesses: a card
  that turns itself is at the upright root (raw window), one that doesn't is in a frame the app turned
  by the live rotation (`useRotatedWindowDimensions`).
- **`ConfirmDialog`** uses the header (its own title styles are gone). **`HowToPlayDialog`** has a header
  above the pages, `title`/`icon` props defaulting to "How to Play"/`help-circle-outline` (the Settings
  row's icon): it opens unprompted on a first launch, so it says what it is first. In compact the page
  gaps go 12 -> 8 (`pageCompact`), which is exactly what the header cost a page on a 402pt-tall window
  (measured on Solitaire's web build: 184 needed, 176 available, 176/176 after). Smaller phones held
  sideways (375, 360) still scroll a page a little; the art can't shrink (apps draw it at fixed sizes).
- **`BaseSettingsDialog`** opens with `DialogHeader` (`cog`, "Settings", compact by the frame's height)
  instead of Paper's `Dialog.Title`, ends with a Done button (`actionButtonSingle`, primary, calls
  `onDismiss`; a tap outside still closes it), drops the scroll area's hairline dividers (no other dialog
  has them), and is exactly as wide as the cards: `min(360, frame width - 2 * max(left inset, right
  inset, 24))`, passed as the Dialog's `width` (auto-paper's own 32pt margin and 400 cap made it 16pt
  narrower than a confirm on a phone; the centered card overhangs that padding).
- **The Settings header scrolls away with the rows** (Jay, same day: so a long sheet gives the rows the
  whole card once scrolled). `DialogHeader` is the ScrollView's first child (`scrollContent`: 24 top,
  16 gap, 16 bottom), `Dialog.ScrollArea` is the Dialog's first child so it runs to the card's top edge,
  and Done stays pinned below it. Compact still applies sideways: it is what shows first. The guide's
  header stays fixed (its pages swipe sideways; a header inside them would slide with every swipe), and
  the cards that never scroll are unchanged.
- **The Blur row says what it does:** "Frost behind dialogs" under the label, the other rows'
  `bodySmall` subtitle (Jay's wording, 2026-10-15). One line even on a 360pt phone (216pt of room;
  measured on Solitaire's web build).
- **Row captions are short commands with no articles, in sentence case** (Jay, 2026-10-15): "Pin current
  layout" (Lock Orientation), "Require second swipe" (Edge Guard), "Replay quick intro" (How to Play),
  "Frost behind dialogs" (Blur). They used to mix descriptions ("Pins the current layout", "Requires a
  second swipe") with commands. Labels stay Title Case; a caption is a short line under one, so sentence
  case. Swirlio's comments and CLAUDE.md still quote Edge Guard's old caption.
- **Tried and rejected: a frosted Done footer** (Jay asked, 2026-10-15, as a cue that a sheet scrolls).
  The Done row pinned over the bottom of the scroll area as its own auto-paper `BlurView` showed a hard
  seam on both platforms, and the rows under it were never frosted: on web a `backdrop-filter` inside the
  card's own `backdrop-filter` can't see past the card (the card is its backdrop root), so the strip
  showed the page behind unblurred; on iOS (a Release build on the iPhone 18 Pro simulator) the footer's
  blur sampled the game behind the sheet, not the sheet's rows, and read as a lighter separate panel.
- **What shipped instead: `FadingScrollView`, now in `@rific/auto-paper` (>= 0.13.0)** (it lived here as
  src/FadingScrollView.tsx first; Jay moved it upstream the same day so every app can use it, and the
  Settings sheet imports it from there). As first built here: A ScrollView whose content
  fades to transparent over its bottom `SCROLL_FADE_HEIGHT` (24pt) while there is more to scroll, and not
  once at the end. It masks the content instead of painting over it, so the card behind (blurred or
  plain, light or dark) stays one continuous surface: no seam. Sizes are kept in a ref and only "more
  below" is state, so scrolling re-renders nothing until the fade turns on or off. iOS/Android: a
  `MaskedView` whose bottom band is RN's native `experimental_backgroundImage` linear gradient. Web:
  react-native-masked-view's web build renders ONLY the mask element (no masking), so the outer box gets a
  CSS `mask-image` instead (react-native-web passes it through). **`@react-native-masked-view/masked-view`
  is an OPTIONAL peer, `require`d inside try/catch:** BaseSettingsDialog uses this, it is part of the
  chrome entry, and Hangman has no masked-view (the fleet's other apps get it through expo-router). Expo's
  Metro allows optional dependencies (`allowOptionalDependencies: true` in @expo/metro-config, and hud is
  bundled from its own source), so a missing package throws at runtime, is caught, and the content just
  doesn't fade. In auto-paper the masked-view module is handed in through its Provider (`maskedView`)
  instead, auto-paper's pattern for optional peers, so hud no longer requires it and the chrome boundary
  test needed no exception. Used by the Settings sheet and Solitaire's RulesDialog, and since 2026-10-16 by `BaseStatsScreen`'s content too (Jay: every scrolling screen alike; `@tastic/profile`'s `ProfilesManager` and Solitaire's Home took it the same day; `BaseStatsScreen.test.tsx` pins it). That change is unreleased as of this note. Seen on web and on the iOS simulator (the JS bundle exported with `expo
  export:embed` and swapped into the installed Release build). Not seen: Android, a real device, Hangman.
- **Section labels are all `labelMedium`** (letter-spaced, `onSurfaceVariant`): VERSION was `labelSmall`
  while APPEARANCE and every app's own labels were `labelMedium`.
- Not changed: auto-paper itself (its Dialog keeps 32/400 for every non-hud caller), and the fade: the
  Settings sheet still fades in and out (auto-paper's Dialog) while the overlay cards appear at once.

### Keep Awake row in BaseSettingsDialog (2026-10-15)

(Superseded on 2026-10-17: the row reads `@rific/core`'s setting and the prop pair is gone. See "Keep
Awake reads @rific/core" below. Kept for the history.)

- **`keepAwake`/`onKeepAwakeChange`**, an optional pair like Lock Orientation's: the "Keep Awake" row
  (caption "Stop auto-lock mid-match", icon `eye`/`eye-closed`) sits after Edge Guard. Jay asked for it
  while the five games were adding `expo-keep-awake` to `/game` (audit F086: Pong's tilt steering never
  touches the screen, so a release build could lock mid-rally).
- **The dialog only toggles it.** Each app keeps the screen awake itself (its own `expo-keep-awake` call
  on its match screen, gated on its own persisted `keepAwake`, default on), so hud takes no native
  dependency for this.
- **Shown where Lock Orientation is** (`isTouchPrimary`: native, and touch-first mobile browsers). A
  desktop or laptop browser stays awake while someone plays with its keyboard or mouse, so the row
  would be clutter there; the app's default still applies.
- Tested in `BaseSettingsDialog.test.tsx` (shown and reported, hidden on desktop, omitted without the
  props, tertiary accent while on). Needs a release before the games can use it from npm (a new prop
  pair, so a minor).

### Keep Awake reads @rific/core (2026-10-17)

The 10-15 design (the dialog only toggled a value the app passed in) made every game copy a settings
field, the prop pair, and an identical `expo-keep-awake` effect, and every game still without it would
need all three. Jay: upstream is always preferred, and not worth its own package, so `@rific/core` got
an opt-in Keep Awake (see its README): a persisted setting (`KeepAwakeProvider`, `keepAwakeReducer`),
`useKeepAwake(tag)` for the screen that needs it, and `expo-keep-awake` injected by the app.

- **The row reads core, no props.** `useKeepAwakeSettings()` for the value (`set({ enabled })` on
  press), same as the Sound row reads feedback-press. **`keepAwake`/`onKeepAwakeChange` are removed**
  (breaking): the five games passing them have to drop them when they take this hud.
- **Shown when `isTouchPrimary && useExpoKeepAwake() !== undefined`**, i.e. the app handed
  `expo-keep-awake` to core's `KeepAwakeProvider`. Same opt-in signal as the Blur row's
  `useBlurModule()`. Caption, icon and accent are unchanged.
- **Hidden on a browser that can't keep awake, by core, not here** (2026-10-17). `isTouchPrimary` lets
  the row onto phone browsers (and any web window under 700px, like the desktop app's preview pane,
  where Jay first took it for a desktop leak), and expo-keep-awake works there through the Screen
  Wake Lock API. Where that API is missing, core's `KeepAwakeProvider` withholds the module, so
  `useExpoKeepAwake()` is undefined and the row hides with no change to this gate. Core also asks for
  the lock again when the page is visible again (browsers drop it on every tab or app switch). Both
  are in core 0.4.1 (released 2026-10-17; the devDependency here is `^0.4.1`, the peer floor stays
  `>=0.4.0` since nothing here needs the new behavior to compile or run); see its CLAUDE.md, "Keep
  Awake on web".
- **`@rific/core` is a new, non-optional peer (`>=0.4.0`)**, and allowed in `./chrome`
  (`chromeImports.test.ts`): every app already depends on it (feedback-press peers on it). 0.4.0 is
  the release that added Keep Awake (published 2026-10-17); the devDependency is `^0.4.0`.
- **Tests mock `@rific/core`** (`src/__mocks__/rific-core.ts`, mapped in `jest.config.cjs`): the real
  package resolves to raw `.ts` under node_modules, the same reason `@tastic/core` is mocked. The mock
  returns no module by default, so the row only appears in tests that hand one back.

### Stats screen gaps found in Hangman's review (2026-10-16)

Hangman's Stats & Achievements screen (BaseStatsScreen and friends through `./chrome`) turned up three
gaps, each fixed here for every game at once:

- **`BaseStatsScreen` labels its header arrow.** `backLabel` (default 'Back', CornerActionButtons'
  name and default) goes to the IconButton's `accessibilityLabel`; before, screen readers said only
  "button". `hitSlop` is opt-in and forwarded unchanged, the same as CornerActionButtons' (needs
  feedback-press 0.13.0+ to reach past Paper's clipped box; ignored on web). Not a default, for the
  same reason as the corner buttons' (Jay's opt-in call, 2026-10-15).
- **`AchievementCatalogSection` darkens the check mark and progress bar in light mode.** `checkColor`
  (which AchievementRow also uses for the progress bar) is `getBlendedColor('#000000', tierColor, 0.5)`
  when `!dark`, the raw tier color in dark mode. Raw gold and silver are about 1.4:1 and 1.8:1 on white;
  mixed, about 5:1 and 6:1. The badge keeps the true tier color (its glyph is black). This is
  Hangman's own `tierAccent`, promoted. No prop to turn it off: the five arcade games all render it on
  the default white screen, and Solitaire (white chrome on felt) renders AchievementRow itself.
  AchievementRow's own props stay literal, so a caller rendering rows itself picks its own colors.
- **`ConfirmDialog` handles Android back.** It's a Portal over a View, not a Modal, so back used to fall
  through to whatever was underneath (in Hangman, the stats screen's own listener closed the screen
  with the confirm still up). While visible it now adds a `hardwareBackPress` listener that calls
  `onCancel` and returns true; RN calls the newest listener first, so it wins over a screen's or
  Paper Modal's listener added before it opened. It always consumes the press, even with no
  `onCancel` (a confirm-only card, like Hangman's PnpHandoffDialog, has to be answered). A caller that
  wants back to dismiss a one-button card passes `onCancel` without `cancelLabel` (no button appears):
  BaseSettingsDialog's OK message does. `onCancel` is read through a ref so the listener is added once per opening: the
  callers pass inline arrows, and re-adding on every render would move it ahead of anything opened
  above it since. In the games' Paused card, Cancel is Quit, so back still leaves the match, as it did
  before through the router.

### Wells are the dialog surface on a shadow (2026-10-17)

Prompted by Solitaire, whose Achievements wells (a translucent tint) read as a different thing from its Home tiles
(an opaque card). Jay: every raised card should be the surface the dialogs use, fleet-wide; MD3's tonal elevation
was offered and turned down (it washes the surface with the primary, like the dialogs no longer are), so a well is
the plain surface plus MD3's level-1 SHADOW. `src/wellSurface.ts`:

- **`WELL_SHADOW`** is MD3's level-1 elevation shadow as a `boxShadow` (its web spec's two layers). `StatSection`'s
  section and every `AchievementRow` carry it. An app's own wells (Solitaire's Home tiles) use the same constant.
- **`useWellColors()`** gives `{ bg: surface, fg: onSurface, fgMuted: onSurfaceVariant }`, the dialogs' roles
  (`useOverlayCardColors`). It is the default for `StatSection`, `StatRow` (which sits in one) and `AchievementRow`.
  Every override prop still works.
- **Why the shadow, not just the surface:** react-native-paper's MD3 themes (which auto-paper keeps) give
  `background` and `surface` the same tone (#FFFBFE light, #1C1B1F dark), and BaseStatsScreen's light-mode #FFFFFF is
  the same to the eye, so a plain surface well vanishes on a light screen. In dark mode the surface is already lighter
  than BaseStatsScreen's black and the shadow barely shows. Before this, the defaults were a 6% white / 4% black tint.
- **`AchievementCatalogSection` and `ActivityStatSection` take `sectionBg`** (and ActivityStatSection `fg`/`fgMuted`),
  passed to their rows: an app with its own palette couldn't reach those two before. The catalog's heading is drawn on
  the screen, not a well, so its default is still the screen-derived muted color.
- **Not changed:** `BaseStatsScreen`'s own background (#000/#FFF by default), the badge colors, `LOCKED_BADGE_COLOR`.
- **Per app, when it takes this version:** Hangman passes `bg={theme.colors.surface}` to BaseStatsScreen, so its wells
  are surface on surface (the shadow alone shows them in light mode; in dark mode, little at all), and should drop that
  `bg`. LightCycles' own ColorStatRow/ProfileRankingRow repeat the old `#FFF`/`#000` text formula and should read
  `useWellColors()`.
- Seen on Solitaire's web build only (yalc-linked; light and dark on its felt, plus light with the felt covered white
  to stand in for a plain screen). Not on a device, not in another game.

### The press-away pattern for split-screen (no component for this - it's a wiring pattern)

A single full-screen `PressAwayOverlay` works for one player. For two players sharing a screen, the
"broadest zone" owner's overlay covers the whole screen, and every other player's zone-scoped
overlay must stay mounted (shielding, even if not actually closing anything) whenever *any*
host with broader reach is open - not just their own - or a tap on their own side can fall through
and close the other player's popover. See the package README for the full code example; this isn't
enforced by any component here, since the zone rectangles are always specific to the consuming
app's own layout.

### The guide subpath - `@tastic/hud/guide` (2026-09-19)

A paged, skippable "how to play" flow (`src/guide/`): `HowToPlayDialog` (controlled card), `GuideProvider` +
`useGuide()` + `useAutoShowGuide()` (context, once-per-session auto-show), `createGuideSlice` (the persisted
"seen version" flag), `createReturningPlayerMigrate` (see below), and the shared illustrations `SwipeHint` (finger or
`pointer='mouse'`), `DirectionKeysHint` (inverted T, or `axis='vertical'`), `SeatDiagram` and `SeatDevicesHint`. Built exactly like `./skia`
and for the same reason - a standalone tsup entry (`src/guide/index.ts` → `dist/guide/index.*`; esbuild keeps
an entry's path relative to the common `src/` root) reachable without touching the barrel, so it carries none
of the barrel's peer-dependency surface. `BaseSettingsDialog` also gained an optional `onShowHowToPlay` (a
"How to Play" row in the toggle group, hidden when omitted; press calls `onDismiss()` first, then the
callback, so the two overlays never stack).

**Jay's calls on the look (2026-09-24), don't drift from them:** Title Case titles and labels (the fleet
convention: "Quit Match?", "Lock Orientation"; the row is "How to Play"), one-word buttons, and the exact
ConfirmDialog action row. That row now lives in `overlayCard.ts` as `overlayActionStyles` (moved out of
ConfirmDialog, which uses it too) so the two can't diverge: outlined secondary left, contained primary
right, 128 minimum each. Skip and Back share the secondary slot (three full-size buttons don't fit), so
Skip shows on the first card only; Android back skips from anywhere. The last card's button is `Ready`.
The guide's first version used text-mode Skip/Back, the only text buttons in the fleet.

**Uniform by construction (Jay, 2026-09-24: "I want all of them to be uniform. Only their content should be
different. The uniform component should be upstream.").** A game supplies its `steps` (title, body, art) and
the environment (seen version, rotation) and nothing else: there is deliberately no prop for button labels,
the Settings row label, layout, or colors beyond the app's own theme. `finishLabel` (GuideProvider /
HowToPlayDialog) and `howToPlayLabel` (BaseSettingsDialog) existed briefly and were removed for exactly this
reason. Don't add per-app knobs back; a change to the look is a change here, for every game at once.

**The pager syncs from `onScroll`, not just `onMomentumScrollEnd` (2026-09-24).** react-native-web never fires
the momentum events (its ScrollViewBase only emits onScroll), so on web a swipe or trackpad scroll moved the
cards while the dots and Skip/Back/Next/Ready stayed on the old page (Jay spotted it in Solitaire). The index
now follows whichever page is more than half in view. A Next/Back tap records its target page in a ref and
ignores intermediate offsets until the animation arrives (otherwise the dots flicker back to the page being
left); native's momentum-end event clears a target an interrupted animation never reached.

**Why it's here and not in `@tastic/core` or a new package:** `@tastic/core` is the base layer the headless
packages (`input`, `physics`) peer on and has no UI peers today; dialogs need paper, reanimated, auto-paper and
feedback-press. This package is already the shared-dialog home and 6 of the 7 games depend on it. The one app
without it, Hangman (no Skia, no `@tastic/profile`, no `@tastic/split-screen`; it has had `@tastic/core` for
its Expo config plugin since 2026-10-08), is exactly why hud's light subpaths must stay light.

**The import boundary is load-bearing.** Nothing under `src/guide/` may import `@tastic/core`,
`@tastic/profile`, `@tastic/split-screen`, `@tastic/achievements`, `@rific/updater`, Skia, or the main barrel.
Those six are `optional` in `peerDependenciesMeta` (that's what lets a light app install hud without them), and
`src/__tests__/guideImports.test.ts` asserts the source-level boundary - the unit tests above it mock every
peer and would never catch a regression here; it would surface as a broken Hangman bundle. The one borrowed
module, `src/overlayCard.ts`, imports only `react-native` (also asserted). The guide also borrows
`src/OverlaySurface.tsx` (2026-10-15), which may import only `react`, `react-native`, `@rific/auto-paper`
and `./overlayCard` (asserted the same way). Because it can't import
`@tastic/core`, rotation is `GuideRotation` (a structural copy of core's `ViewRotation`) and the card builds
its own `rotate` transform.

**Size the card against the SWAPPED window when it's quarter-turned (2026-09-24).** The first version took a
pre-rotated `style` from the caller and sized the card from the raw window width. But the fleet's rotation is
fake (the OS window stays portrait), so a sideways card's on-screen width is its layout HEIGHT, which has to
fit the window's short edge. The Solitaire review measured about 378pt of card against a 360pt Android phone.
`getGuideCardSize(windowWidth, windowHeight, rotation)` now swaps the axes for +/-90, lets a turned card go
up to 520 wide (shorter lines, fewer of them), caps its height, and shrinks the art box to 88 under 480pt of
usable height. Each page is also its own vertical ScrollView inside a shrinkable pager, so anything that
still doesn't fit scrolls instead of clipping. Not yet checked on a real device held sideways.

Gotchas worth knowing:
- **`GuideAction` must be a `type` alias, not an `interface`.** redux's `UnknownAction` has a string index
  signature and only an object-literal type alias is implicitly assignable to one; as an interface,
  `configureStore` rejects the reducer at the *consuming app's* typecheck (found in LightCycles, invisible in
  this repo). Pinned by a compile-time assertion in `guideSlice.test.ts`.
- **`createGuideSlice` alone does NOT grandfather players whose last shipped build had no root store.**
  Found 2026-09-24: LightCycles, AirHockey, BoxHockey and Pong all got their redux-persist root store
  after their last shipped update, so their current players rehydrate with no payload, exactly like a fresh
  install. `createReturningPlayerMigrate(AsyncStorage, legacyKeys)` goes in the persistConfig's `migrate`:
  no root store + any key the shipped build wrote = rehydrate with an empty payload, which the slice
  grandfathers. Race-free because redux-persist runs `migrate` before REHYDRATE and before PersistGate
  renders anything. Pong's rollout agent found the mechanism; it was promoted here so every app shares it.
  Take `legacyKeys` from the last shipped commit's source (`git log -G otaVersion -- src/constants/release.ts`),
  not today's: Pong's shipped build really did write `airhockey.*` keys (a copy-paste leftover in its
  `Feedback.tsx`/`Theme.tsx` constants). Verify every key against actual writes, not comments:
  AirHockey's `useGameStats.tsx` carried a comment claiming it wrote `boxhockey.achievements`, but
  `@tastic/achievements` builds the key from the namespace, so it wrote `airhockey.achievements`.
- **`createGuideSlice` tells a fresh install from an existing player.** Fresh install: `REHYDRATE` payload is
  `undefined` (redux-persist's `getStoredState` finds nothing). Existing player: a payload object with no
  `[mountKey]` entry, stamped with `currentVersion` so an OTA update never shows them the guide. A REHYDRATE
  for a *different* persist key (`action.key !== persistKey`) is ignored, or a nested persisted reducer's
  substate would look like "an existing player". Verified against real redux-persist in LightCycles.
- **The pager syncs its index from `onScroll` with a target-page guard** (see "The pager syncs from `onScroll`"
  above): `onMomentumScrollEnd` alone never fires on web. Page width is
  computed up front from `useWindowDimensions()` (card `maxWidth` 360, minus gutters/padding) because the
  ScrollView snaps to multiples of it. `raw window width` is right only while the dialog mounts at the app
  root, outside any rotated view.
- **`GuideProvider`'s default context is a no-op, not a throw**, so an app's own tests rendering Settings or
  Home without a provider don't break - at the cost that a missing provider fails silently (a dead row).
- **Jest mocks:** the `react-native` mock's `ScrollView` is still a plain `jest.fn` (InlineColorPicker's test
  reads `ScrollView.mock.calls`) but now attaches a `scrollTo` imperative handle via the React 19 `ref`-as-prop;
  it also gained `BackHandler`. The reanimated mock gained `useReducedMotion`, `withRepeat`, `withSequence`.
  Import the `mock*` helpers from `../__mocks__/react-native`, not `'react-native'`, so TypeScript sees them.
- **Never `yalc push` from this repo.** It publishes and then updates *every* project registered in yalc's
  store for this package (`~/.yalc/installations.json`), rewriting their `package.json` to `file:.yalc/...`.
  Use `yalc publish` here and `yalc link @tastic/hud` (no `package.json` change) in the one app you're testing.

### The chrome subpath - `@tastic/hud/chrome` (2026-10-14)

`src/chrome/index.ts` re-exports the fleet's shared chrome from the existing files in `src/`:
`BaseSettingsDialog`, `ConfirmDialog`, `UpdateDialog`, `RotatedFrame`, `BaseStatsScreen`, `StatSection`,
`StatRow`, `AchievementRow`, `LOCKED_BADGE_COLOR`, `AchievementCatalogSection`, `ActivityStatSection`,
`CornerActionButtons`, `ContentGutter`, `StaggeredWord`, `getStaggeredWordDuration`, `OverlayCard`,
`OverlayBackdrop`, `useOverlayCardColors`, `SecondaryButton`, `DialogHeader`, `useCompactDialog`, `isCompactDialogHeight`, `COMPACT_DIALOG_HEIGHT`, `overlayStyles`,
`overlayActionStyles`, `MONO_FONT`, `useWellColors` and `WELL_SHADOW`, plus (since 0.23.0) the popover
pieces `PopoverBody`, `PressAwayOverlay`, `usePopoverHost` (with its `PopoverHost` type) and `useAutoAlign`
(with `AlignResult`, `PopoverAlign`, `PopoverRotation` and `PopoverVerticalAlign`), and `InlineColorPicker`
with `getInlineColorPickerContentSize`, all with their props types. Built like `./guide`: its own
tsup entry (`dist/chrome/index.*`), and `react-native` and `browser` both point at the source entry.

**The popover pieces are there for `@tastic/profile` (2026-10-17).** Its `ProfilePicker`, `OptionPicker`,
`PickerMenu` and `ProfilesManager` import `PopoverBody`, `PopoverHost`, `PopoverRotation`, `useAutoAlign`,
`usePopoverHost`, `InlineColorPicker`, `getInlineColorPickerContentSize` and `ConfirmDialog` from hud. From
the main entry that pulled Skia and `@tastic/split-screen` into any app using `ProfilePicker` or
`ProfilesScreen`, so Hangman couldn't. `@tastic/profile` 0.16 imports them from `./chrome` instead and needs
hud 0.23.0 or later for these. `PressAwayOverlay` (which profile doesn't import) came along as the press-away half of the same pattern.
`useAutoAlign.ts`'s `rotateRect` stays unexported, as in the main barrel. `useZoneClampedAlign`
(split-screen), `SectionedDropdown` (`TriggerGaugeHost`, so Skia) and `PlayerSetupPanel` (`@tastic/profile`)
stay main-entry only.

**Why it exists:** Hangman is moving onto the fleet's settings dialog, confirm and update dialogs, stats
screen and corner buttons, but importing anything from the main barrel would make it install
`@tastic/profile`, `@tastic/split-screen` and Skia (the barrel also re-exports `PlayerSetupPanel`,
`AchievementUnlockList`, `useZoneClampedAlign` and `TriggerGaugeHost`/`loadSkiaWeb`). Hangman already has
`@tastic/core` and `@rific/updater`, so unlike `./guide` this entry may use those two.

**The import boundary is load-bearing, and it's a graph, not a folder.** These modules sit in `src/` beside
barrel-only ones, so `src/__tests__/chromeImports.test.ts` walks the relative-import graph from
`src/chrome/index.ts` (static imports and re-exports, bare imports, dynamic `import()`, `require()`). Every
package it reaches must be `react`, `react-native`, `react-native-paper`, `react-native-reanimated`,
`react-native-safe-area-context`, `@rific/auto-paper`, `@rific/core` (since 2026-10-17, for the Keep
Awake row), `@rific/feedback-press`, `@rific/updater` or `@tastic/core`, plus `@tastic/achievements` as `import type` only. It also fails if the walk reaches
`src/index.ts` or `AchievementUnlockList.tsx` (it renders `@tastic/profile`'s `ProfileChip`), or a module
with a `.web` twin (one source target serves both platforms; the retired `./skia-gate` needed a second
`browser` target because its entry file itself had a `.web` twin. Metro does resolve a twin further down,
as `./skia` and the main barrel's `loadSkiaWeb` show, but chrome has none). Checked 2026-10-14 by planting `import '@tastic/profile'` in
`StatRow.tsx`, a value import of `@tastic/achievements`, and a dynamic Skia import: each one failed it. So
before adding an import to any shared file this entry reaches, check it against that list.

**`@tastic/achievements` is type-only, but a consumer still needs it installed.** Nothing loads it at runtime.
But `@infinitetoken/tsconfig`'s `/react-native` and `/expo` presets set `customConditions: ["react-native"]`,
so a fleet app's tsc resolves `@tastic/hud/chrome` to this package's raw source and type-checks
`AchievementCatalogSection`'s type import too.

## Public API

The complete `src/index.ts` export barrel, reachable at the package's main `"."` entry point.
`package.json`'s `exports` map also has three subpaths, each a standalone build with less of this
barrel's peer-dependency surface: `"./skia"` (the web Skia loader; see "One way to load Skia" above),
`"./guide"` and `"./chrome"` (see their own sections above). Skia host files import `loadSkiaWeb` from
`@tastic/hud/skia`, not the bare `'@tastic/hud'` barrel below, even in an app that already has every
peer this kit needs, so the host files match across the fleet.

```ts
export { MONO_FONT } from './fonts'
export { ControlSchemePicker, type ControlSchemePickerProps } from './ControlSchemePicker'
export { InlineColorPicker } from './InlineColorPicker'
export { loadSkiaWeb } from './loadSkiaWeb'
export { locateSkiaWebFile } from './locateSkiaWebFile'
export { PopoverBody } from './PopoverBody'
export { PressAwayOverlay } from './PressAwayOverlay'
export { ReadyButton } from './ReadyButton'
export { type MenuOption, type MenuSection, type MultiSelectSection, SectionedDropdown, type SingleSelectSection } from './SectionedDropdown'
export type { TriggerGaugeProps } from './TriggerGauge'
export { default as TriggerGaugeHost } from './TriggerGaugeHost'
export { type PopoverAlign, type PopoverVerticalAlign, useAutoAlign } from './useAutoAlign'
export { type PopoverHost, usePopoverHost } from './usePopoverHost'
```

(This list - and the rest of this doc's Architecture/Testing sections below - was already missing
several real exports, e.g. `AchievementRow`, `BaseSettingsDialog`, `BaseStatsScreen`, `ContentGutter`,
`CornerActionButtons`, `LabeledDropdown`, `SharedActionBand`, `StatRow`, `StatSection`, before this
edit; only `ControlSchemePicker` was added here, so it's still not a complete/accurate barrel - cross-
check `src/index.ts` directly rather than trusting this list exhaustively. Also now missing, as of
the 2026-09-17 `alignOverride`/zone-awareness pass (see README's "Zone-aware popovers" section for
the full story): `AlignResult`, `getColorPopoverId`, `getCpuDifficultyPopoverId`, `PlayerSetupPanel`,
`useZoneClampedAlign`. Also now missing, as of the 2026-09-18 achievements-scaffolding +
`useQuitConfirmation` passes (see Architecture above): `AchievementCatalogSection`,
`ActivityStatSection`, `QuitConfirmation`, `useQuitConfirmation` - this doc's own staleness
compounding is itself evidence for cross-checking `src/index.ts` directly rather than trying to keep
patching this list forward piecemeal.)

`TriggerGauge` itself (the raw Skia component) is deliberately **not** exported - only its type
(`TriggerGaugeProps`) is. A value re-export would force the bundler to fold `TriggerGauge.tsx`'s own
eager `Skia` import into a chunk shared with `TriggerGaugeHost`'s lazy dynamic import, defeating the
lazy-load split for every consumer on every platform. `TriggerGaugeHost` is the only supported way to
render it.

## Peer Dependencies

Real `peerDependencies` from `package.json`, with their actual version floors:

**External:**
- `react` - `>=19.0.0`
- `react-native` - `>=0.76.0`
- `react-native-paper` - `>=5.0.0` (`Icon`, `Text`)
- `react-native-reanimated` - `>=3.0.0` (`Easing`, `useDerivedValue`, `useSharedValue`, `withTiming` - `TriggerGauge.tsx` only)
- `@shopify/react-native-skia` - `>=2.6.0` (`Canvas`, `Path`, `Skia` in `TriggerGauge.tsx`, which builds its arcs with `Skia.PathBuilder` - added in 2.6.0, and the only way to build a path since 2.14 made `SkPath` immutable; `LoadSkiaWeb` via its own `/src/web` subpath in `loadSkiaWeb.web.ts`)

**Internal fleet:**
- `@rific/auto-paper` - `>=0.13.0`, the first release with `FadingScrollView` (the Settings sheet's rows), and after 0.12.2, whose Provider mounts a nested `Portal.Host` inside its own contexts, which `BaseSettingsDialog`'s outer Portal relies on (see "BaseSettingsDialog lays out in a turned frame" above). Uses `AutoAppearancePicker`, `BlurView`, `useBlur`, `useBlurModule`, `useThemeSettings` (all in 0.12.2, for `OverlayCard` and the Blur row), `defaultColors`, `getContrastColor`, `getBlendedColor`, `getColorRoles`, `SeedColor`
- `@rific/feedback-press` - `>=0.10.2`, the first release with `useSoundSettings` (`IconButton`, `TouchableRipple`, `useSoundSettings`)
- `@rific/core` - `>=0.4.0`, the first release with Keep Awake (`useKeepAwakeSettings`, `useExpoKeepAwake` in `BaseSettingsDialog`). See "Keep Awake reads @rific/core" above.
- `@tastic/achievements` - `>=0.2.0` (`AchievementCatalogRow` type, in `AchievementCatalogSection.tsx`
  only - type-only, no value/runtime import; see "AchievementCatalogSection + ActivityStatSection"
  above). The newest peer here (added in the same 2026-09-18 pass as that component) and currently
  resolved via yalc (`file:.yalc/@tastic/achievements` in `devDependencies`) rather than a real
  npm-published version.
- `@tastic/core` - `>=0.12.0`, the first release with `FakeLandscapeView`'s `rotation`/`passThrough` (`RotatedFrame`, `BaseSettingsDialog`; also `clamp`, `useIsTouchPrimaryDevice`, `useRotation`, `useRotatedWindowDimensions`)

None of these are bundled - consumers use whatever versions their app already has. This repo also
declares each of the nine peers above as a `devDependency` (own dev/test/build, at or above the
floor) so lint/typecheck/test/build have something real to run against.

Unrelated to the peer deps above - the fleet's own shared tooling, pulled in as plain
`devDependencies`: `@infinitetoken/eslint-config@^0.1.8`, `@infinitetoken/jest-config@^0.2.0`,
`@infinitetoken/tsconfig@^0.3.0`.

## Testing

- **Framework:** Jest (via `@infinitetoken/jest-config/react-native`, jsdom environment) + `ts-jest`
  (bundled by the shared preset, not a direct dependency of this repo) + `@testing-library/react`
- **Location:** `src/__tests__/*.test.ts`
- **Mocks:** `src/__mocks__/` - `react-native`, `react-native-paper`
- **Current suite** (2026-10-22): 42 test files, 488 tests, all passing. (As of the `SkiaGate` addition, 2026-09: 24 test files, 160 tests -
  now covers component rendering too, not just hooks (this doc previously said otherwise; that was
  already stale before this edit).)
- **Coverage** (`npm test`, freshly run): ~99.6% statements / ~90% branches / ~99% functions overall,
  comfortably clears the fleet shared preset's own default 70% threshold (genuinely enforced -
  `collectCoverage: true` in the shared config, not just documented), so `jest.config.cjs` carries no
  local `coverageThreshold` override at all. If one gets added back for a genuine gap, don't set it
  below what real coverage already achieves.
- When adding new hook behavior, add a corresponding test case.

## Code Style

Enforced entirely by the shared `@infinitetoken/eslint-config/react-native` preset (`eslint.config.cjs`
is a bare `module.exports = require('@infinitetoken/eslint-config/react-native')` - no local
overrides) and its bundled Prettier config (`package.json`'s `"prettier"` field points at
`@infinitetoken/eslint-config/prettier`). Run `npm run lint` before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**Non-default ESLint rules (traced through to the shared preset's source):**
- `simple-import-sort/imports`, `simple-import-sort/exports` - warn
- `react-native/no-inline-styles`, `react-native/no-unused-styles` - warn (`react-native/no-raw-text` is explicitly off)
- `no-console` - warn
- `react-hooks/rules-of-hooks` - error; `react-hooks/exhaustive-deps`, `react-hooks/refs`,
  `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect` - warn
- `@typescript-eslint/no-unused-vars` - warn, but a `_`-prefixed name (var/arg/caught-error) is
  exempt fleet-wide (e.g. `const { id: _id, ...rest } = obj`)
- `@typescript-eslint/no-require-imports` - off
- `package-json/order-properties`, `package-json/sort-collections` - warn, on `package.json` itself
- Test/mock files (`__tests__/`, `__mocks__/`) are linted like any other source, except
  `@typescript-eslint/no-explicit-any` is off there

## PlayerSetupPanel's seat button (2026-10-17)

Solitaire's player button made the fleet's seat control (Jay, 2026-10-16). Each seat is now ONE button opening ONE dropdown, with the seat's color behind a Color row at its top: a human seat with `profiles`/`onProfileSelect` draws `@tastic/profile`'s `ProfilePicker` with a `colorSection`, and a CPU seat with `cpuDifficulty`/`cpuDifficultyOptions`/`onCpuDifficultyChange` draws its new `OptionPicker` (the difficulty levels, `cpuIcon` on the chip) with the same section. The separate color swatch is gone from both; it is only drawn, with the plain `label`, on a seat that has neither picker (unchanged there, `colorAlignOverride`/`colorRotation` included). Released in 0.21.0, a minor; its `@tastic/profile` peer is now `>=0.15.0` (`OptionPicker`, `colorSection.takenValue`).

- **The Color row** is the seat's `color`, `swatches`, the other seat's `takenColor` (faded with an X, or a swap icon with `allowSwapTaken`) and `onColorChange`. New `colorCaption?` (e.g. 'Snake only') shows under it only while a profile is selected on a human seat, never for a guest or the CPU. New `showColor?` (default true) leaves the row out, for a CPU seat set to "no opponent".
- **Placement is the panel's own:** `useZoneClampedAlign(open, size)` sized with `getProfilePickerContentSize(profiles.length, !!onManageProfiles, colorSection)` or `getOptionPickerContentSize(options.length, colorSection)`, handed to the picker as `alignOverride`, so the dropdown stays in that player's half inside a `@tastic/split-screen` zone and is plain `useAutoAlign` outside one. Rotation 0, as the profile, color and difficulty dropdowns it replaced were placed. **`cpuDifficultyAlignOverride` was removed** (breaking); every consumer passed `useZoneClampedAlign` there anyway.
- **Layout:** the button is the header; `pickerRow` (`secondPicker`, plus the fallback swatch) only renders when it has something in it. `getProfilePopoverId(idPrefix)` is new (`${idPrefix}-profile`, the human seat's dropdown); the CPU seat's stays `getCpuDifficultyPopoverId`. Elevation is unchanged: the button's dropdown elevates the panel, `pickerRow` only for its own popovers.
- Tests: `PlayerSetupPanel.test.tsx` rewritten around the button (which picker, its props and Color row, the caption only with a profile, `showColor`, no separate swatch, the empty row dropped, elevation, the placement sized from the same section), against `src/__mocks__/tastic-profile.ts` (now also `OptionPicker` and fixed-size stand-ins for the two size functions). Checked live in Snake's web loadout, 1 Player and 2 Player face to face (see Snake's CLAUDE.md, "The seat button").

## Dependencies brought up to date for the 0.21.0 release (2026-10-17)

Dev dependencies moved to Expo SDK 58, as toaster and auto-paper did on 2026-10-16: `react-native` ^0.88.0, `@shopify/react-native-skia` ^2.14.0, `react-native-reanimated` ^4.7.1, `react-native-safe-area-context` ^5.10.1, `@infinitetoken/tsconfig` ^0.6.0, `@infinitetoken/jest-config` ^0.5.2, and the fleet's own `@rific/auto-paper` ^0.13.3 and `@tastic/profile` ^0.15.0. TypeScript, ESLint and tsup stay on 6, 9 and 8, like the rest of the fleet.

- **`tsconfig.json`'s `customConditions`** (set here to keep tsc off sibling packages' raw source) now lists `react-native-legacy-deep-imports`, the preset's temporary condition for React Native 0.88's pre-strict types; with `[]` it dropped it and type-checked against the strict types (see TODO.md).
- **`jest.config.cjs` compiles tests to plain CommonJS** (`module: 'CommonJS'`, `moduleResolution: 'node10'`, `ignoreDeprecations: '6.0'`). jest-config 0.5's ts-jest uses Node16 modules, which keep `TriggerGaugeHost`'s lazy `import('./TriggerGauge')` as a real dynamic import, and Jest can't run one without `--experimental-vm-modules`: 29 tests in three files (TriggerGaugeHost, SectionedDropdown, ControlSchemePicker) failed with "A dynamic import callback was invoked". Only the test transform changes; the package's own build and `tsc` don't.

## BaseSettingsDialog lays out in a turned frame; `RotatedFrame` (2026-10-08)

Audit F190: turned 90deg, the settings sheet ran off the phone's short edge and its top row (Lock
Orientation, the way back out of landscape) was clipped with no way to scroll to it. It used to rotate
its card in place with `toRotationStyle`, but Paper's Portal mounts outside every turned frame, so the
card's `maxHeight: '90%'` was still resolved against the PORTRAIT window. Now `BaseSettingsDialog`
returns `<Portal><RotatedFrame rotation rotatedSafeArea portalHost passThrough>` around the Dialog and
both ConfirmDialogs (which get `rotation={0}`): the frame is sized to the turned footprint and the
Dialog portals into the frame's own host. At rotation 0 it is an identity frame, so Solitaire (which
passes `rotation={0}` from inside its own in-frame host) and web are unchanged.

The frame is mounted from the FIRST OPEN on and then kept (0.14.1; `opened` state set during render).
Kept, so the Dialog's close fade still plays after `visible` turns false. Not before: 0.14.0 mounted
the Portal on every render, which threw in any consumer test rendering a screen without a Paper
Provider (Snake's Home test) and put a pass-through layer on every screen that never opens Settings.
Mounting at open time is also when the Dialog's own Portal always mounted, so the z-order against
other portals is what it was.

`RotatedFrame` (`src/RotatedFrame.tsx`) is Solitaire's `components/RotatedScreen.tsx` frame, lifted and
given a `rotation` override: `FakeLandscapeView(rotation, passThrough) > SafeAreaInsetsContext.Provider
> [Portal.Host] > column`. It needs `@tastic/core` 0.12.0's `FakeLandscapeView` `rotation` and
`passThrough` props, so the core peer floor is `>=0.12.0`. Below that, the always-mounted frame's inner
view would NOT be box-none and would swallow every touch beneath it, not just look wrong.

**The outer Portal moves the Dialog's own BODY to the portal host, not just its output.** Paper's
Portal re-provides only Paper's theme and settings, so anything the auto-paper Dialog reads from
auto-paper's context (expo-blur, Reanimated, `defaults`) has to exist at the host. auto-paper 0.12.2+
mounts a nested `Portal.Host` inside those contexts (its ThemeProvider), which is the nearest host for
every flagship (their `FeedbackPressProvider` host sits ABOVE auto-paper). So the auto-paper peer floor
is `>=0.12.2`; on an older auto-paper the sheet would silently lose its blur and its pop-in. Other
contexts are lost at the host too (orientation, profiles, navigation), which is fine: the app's
`children` sections were already rendered at that host by the Dialog's own Portal, and the
frame's `FakeLandscapeView` gets an explicit `rotation` (core's orientation context has a default).

Not verified on a device yet: the sheet at +/-90 (both end rows reachable, scrolling, safe-area edges),
the close fade, How to Play opening from Settings, and above all that board touches and gestures are
unaffected while Settings is CLOSED (the pass-through frame stays mounted with the dialog).

## ContentGutter reads the rotated footprint (2026-09-19)

`ContentGutter` clamps against `@tastic/core`'s `useRotatedWindowDimensions()`, not raw
`useWindowDimensions()`. Under a fake-landscape ancestor (`FakeLandscapeView`) the raw width never
changes (the OS window is portrait-locked), so the old read capped a rotated play area at the portrait
width (402) while its contents laid out for the landscape width (874), clipping the board. The hook is
an exact identity with `useWindowDimensions()` at no rotation, so unrotated behavior is unchanged.
`@tastic/core` peer range raised `>=0.3.0` -> `>=0.5.0` (first tag exporting the hook).

Audit of the other raw `useWindowDimensions()` / `useSafeAreaInsets()` consumers, deliberately left as-is:
- `useAutoAlign`: window size is used against `measureInWindow` results, which are in raw window
  coordinates, and `rotateRect` pivots about the raw window centre; the overflow tests compare the
  rotated (visual) rect to the physical screen edges. Raw size is the correct value here - swapping it
  would break the pivot.
- `useZoneClampedAlign`: same raw-window reasoning; its insets are physical device edges (see its own comment).
- `InlineColorPicker`: window width only feeds the auto-column clamp. Inside a rotated ancestor raw width
  under-counts columns (conservative, never clips), and the popover's overflow check runs against the
  physical screen, so a wider rotated picker would not be clearly better. Maintainer: pass `columns`
  explicitly if a landscape layout wants more.
- `guide/HowToPlayDialog`: card width from raw window width; correct as long as the dialog mounts at the
  root (outside the rotated view). If it is ever mounted inside a rotated ancestor, switch it to
  `useRotatedWindowDimensions` (would need a core import in that entry point, which it avoids on purpose).

## Strict ref types, placement bounds and drawn swatches (2026-10-22)

For `@tastic/profile`'s TODOs (Jay wanted them all done before its next release), whose fixes needed these first. A minor release: new props and exports, nothing removed.

- **React Native 0.88's strict types:** a bare `RefObject<View>` there is a ref to the View function, with no `measureInWindow`. `useAutoAlign.ts` exports `ViewInstance = ComponentRef<typeof View>` (a View's instance under the legacy types and the strict ones alike) and types `AlignResult.triggerRef` and its own ref with it; `HowToPlayDialog`'s page scroller is `ComponentRef<typeof ScrollView>`. That cleared every error in `src` (the TODO's nine, in `InlineColorPicker`, `LabeledDropdown`, `SectionedDropdown`, `HowToPlayDialog`, `useAutoAlign` and `useZoneClampedAlign`) and the tests' (their fake triggers are `as unknown as ViewInstance`, their ScrollView mocks `as unknown as jest.Mock`). Under the legacy types `ViewInstance` is exactly the old `View`, so no consumer's types change. Checked with `npx tsc --noEmit -p tsconfig.json --customConditions <anything>` (a condition that drops `react-native-legacy-deep-imports`). Two kinds of error are left under that check, neither this repo's own: `PlayerSetupPanel` hands hud's `AlignResult` to `@tastic/profile`'s pickers, whose published types (0.16.2) still say `RefObject<View>` (it cleared with profile 0.17.0, the devDependency since the same day), and `@shopify/react-native-skia`'s own `src` (`NodeHandle`, `ViewComponent`).
- **`useAutoAlign`'s `bounds`** (a fifth, optional parameter, `RefObject<ViewInstance | null>`): a View the popover can't leave. A popover in a scroll view is clipped at its edges, so a picker in a roster capped to a column in a wide window could open centred against the window and be cut off (Solitaire's Profiles screen on desktop web). With it, the bounds view is measured and rotated like the trigger, kept inside the window, and its edges stand in for the window's on every side, for the horizontal choice and the room above and below. Unmounted (`current` null) or omitted, it's the window, as before. The measurement moved from a `useCallback` into the effect itself (the React Compiler lint can't keep a memoized callback that reads `bounds.current`); it re-measures on the same changes as before, plus a new `bounds`.
- **`InlineColorPicker`'s `bounds`** passes straight to its `useAutoAlign` (an `alignOverride` still replaces that placement whole), and **`renderSwatch?: (color, size, place) => ReactNode`** (`InlineColorPickerSwatchRenderer`, `place` an `InlineColorPickerSwatchPlace`, `'trigger' | 'swatch'`) draws the trigger and each grid swatch in place of its flat fill: `color` is the drawn color (after `previewValue`) and stays the one marks take their contrast from; the drawing (`SwatchDrawing`, absolute at the swatch's top left, clipped round, no pointer events) sits behind the trigger's tag or icon and each swatch's check, X or swap icon; the selected swatch's drawing is 24pt, inside its 2pt white ring (`SWATCH_RING_WIDTH`); a TouchableRipple takes one child, so a drawn swatch's child is a face View holding the drawing and the mark. Null or undefined keeps that swatch flat. The same shape as `@tastic/profile`'s `renderSwatch`, which `ProfilesManager` now hands here.
- Exports (main and `./chrome`): `ViewInstance`, `InlineColorPickerSwatchPlace`, `InlineColorPickerSwatchRenderer`.
- **`useAutoAlign` is annotated `: AlignResult` (0.25.1).** 0.25.0 left its return type inferred, and the declaration build printed the inferred ref as `RefObject<View | null>` (the legacy types' name for `ViewInstance`), so a package reading hud's `dist` types (`@tastic/profile`) still saw the old ref under the strict types. Check `dist/**/*.d.ts` for `RefObject<View` after a change like this: the source type-checking clean doesn't show it.
- Tests: `useAutoAlign.test.ts`'s bounds describe (4: sides, top and bottom, bounds past the window, unmounted bounds) and `InlineColorPicker.test.tsx`'s renderSwatch describe (3) and bounds case. Five fail on the old files. Not seen on a device or the web.

## SecondaryButton (2026-10-20)

`SecondaryButton` (`src/SecondaryButton.tsx`, in the main barrel and `./chrome`) is an overlay card's
secondary action: outlined, labeled in `useOverlayCardColors().fg`, styled `overlayActionStyles.actionButton`,
with every prop overriding those defaults (a `style` is laid over the row's). Paper's outlined label is the
theme's primary by default, which on a 2 Player result card read as the other seat's color; Jay wanted the
secondary neutral everywhere, as a default rather than a `textColor` each card has to remember. `ConfirmDialog`'s
Cancel and the guide's Skip/Back use it (the guide may import it: it only pulls in `@rific/feedback-press`,
`overlayCard` and `OverlaySurface`, pinned by `guideImports.test.ts`). The games' result-card Quit buttons
pass `textColor` by hand until they move to it.

