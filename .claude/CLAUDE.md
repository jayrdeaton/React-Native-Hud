# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

# @tastic/hud

Visual component kit for local-multiplayer React Native games: inline (non-modal) popovers,
dropdowns, color pickers, gauges, ready buttons, and dialogs — built so a control scoped to one
player's own zone never blocks the rest of the screen, which is what lets two players configure
their own settings on one shared device at the same time.

Part of the `@tastic` package ecosystem — game-specific UI, as opposed to `@rific`'s generic React
Native tooling. Published (public) at https://www.npmjs.com/package/@tastic/hud — `package.json` has
no `"private"` field and `publishConfig.access` is `"public"`; the registry currently has `0.1.0`
through `0.1.5`, matching this repo's current version and `v0.1.5` git tag. Sibling package:
`@tastic/split-screen` (`../React-Native-Split-Screen`), the two-player layout/orientation engine
this kit's components are designed to render correctly inside (in particular, `PopoverBody`'s
positioning survives an ancestor's 180° rotation). Neither package depends on the other — they
compose at the consuming app's own screen.

## Commands

```bash
npm run lint      # ESLint (includes Prettier via eslint-plugin-prettier) check
npm run fix       # Auto-fix lint/format issues
npm run typecheck # TypeScript type check (tsc --noEmit)
npm test          # Run all Jest tests (with coverage)
npm run build     # Compile to dist/ via tsup
npm run verify    # lint && test && typecheck && build — the full gate, also run by CI and by `preversion`
```

Always run `npm run lint` before finishing any task.

## Release

Version bumps, tagging, and pushing are handled by dedicated npm scripts — never run `npm version`
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
| `usePopoverHost.ts` | `{openId, toggle, close}` — tracks which one popover is open within a group. One instance per independent editor (e.g. one per player's panel) so opening a popover in one group never affects another. |
| `PopoverBody.tsx` | Low-level popover shell: position (`align`/`verticalAlign`), the connecting caret triangle. Rendered inline as an absolutely-positioned sibling of its trigger — never via Portal — so it inherits any rotation transform the trigger's zone applies. |
| `useAutoAlign.ts` | Measures a trigger's actual on-screen position via `measureInWindow` (resolves post-transform — rotation-safe) and picks whichever `align`/`verticalAlign` keeps a popover of a given size from overflowing a screen edge. Also returns `maxHeight`, the room available in whichever direction it picked, for the caller to cap content and scroll instead of overflowing when neither direction has enough room. |
| `SectionedDropdown.tsx` | Popover holding any mix of single-select ("pick one", radio-style) and multi-select ("pick some", checkbox-style, optional all/clear footer) sections, divided by rules. Covers a plain single-value picker, a multi-select toggle list, or a combined menu (e.g. frequency + which types) — all the same component. Its trigger renders a `TriggerGaugeHost` ring showing every section's current state at a glance, without opening the menu. |
| `ControlSchemePicker.tsx` | A `SectionedDropdown` opinionated for one job: picking which physical input (a keyboard layout — the raw layouts themselves live in `@tastic/input`, this repo has no opinion on which exist — or something else entirely, e.g. "keep using pointer input") drives a local seat in a couch-multiplayer game. Fixes the trigger icon/accessibility label and, the actual reason it's its own component rather than a usage snippet, bakes in the `Platform.OS === 'web' && !useIsTouchPrimaryDevice()` gate every consumer was independently re-deriving — renders `null` outside that (a physical-key scheme has no meaning on native or a touch-primary device), so it's safe to mount unconditionally inside a caller's own per-seat layout. Generic over `T`, same as `SectionedDropdown`'s own `MenuOption<T>` — a caller always supplies its own `options`. |
| `InlineColorPicker.tsx` | Swatch-grid color popover. Auto-computes column count from screen width (4–5 columns — clamped to whichever fills a complete row of `defaultColors`' 20 swatches). Supports a "taken" color shown disabled or swappable. |
| `TriggerGauge.tsx` | Skia-drawn (`Canvas`/`Path`/`Skia`) decorative ring of animated (`react-native-reanimated`) tick marks around a trigger, showing which option(s) are active without opening the popover. Pure presentational, no popover/host coupling. Not exported directly — see `TriggerGaugeHost` and Public API below. |
| `TriggerGaugeHost.tsx` | The only supported way to render a trigger gauge — and `SkiaGate`'s own canonical usage example. Mounts `TriggerGauge.tsx` through `SkiaGate` so its `Skia`-binding import is never evaluated before Skia is actually ready (real on native, WASM-loaded on web) and never eagerly bundled into this package's own top-level import graph. Default export, re-exported as a named export from `index.ts`. |
| `SkiaGate.tsx` | Generic version of the lazy-mount-behind-Skia-readiness pattern `TriggerGaugeHost.tsx` needs — extracted so consuming apps don't each hand-roll their own copy (see the "Why SkiaGate exists" note below). Takes `getComponent` (a dynamic import, hoisted to module scope by the caller), `componentProps`, and an optional `fallback`. Deliberately avoids `React.lazy()` — a generic `getComponent` prop can't safely feed one inline during render (`react-hooks/static-components`) — in favor of `useEffect`+`useState` awaiting the import directly. |
| `SkiaGate.web.tsx` | Web counterpart — a direct re-export of `@shopify/react-native-skia`'s own `WithSkiaWeb` (same `/src/web` subpath as `loadSkiaWeb.web.ts`), which gates the same mount behind `LoadSkiaWeb()` first. Metro's platform-extension resolution (this file vs. `SkiaGate.tsx`) is what picks the right one per platform — a consumer just imports `SkiaGate` from `'@tastic/hud'` and never names either file directly. |
| `loadSkiaWeb.ts` | Native counterpart to `loadSkiaWeb.web.ts` — resolves immediately, since Skia-on-native (JSI, no WASM) needs nothing awaited. Must never import `@shopify/react-native-skia/src/web`, even conditionally — see the file's own comment on why Metro would still pull `canvaskit-wasm`'s `require('fs')` into the native bundle graph. Independent of `SkiaGate`/`SkiaGate.web.tsx` — exported separately for consumers that need to know CanvasKit is ready without going through a `SkiaGate`-mounted component. |
| `loadSkiaWeb.web.ts` | Web counterpart — thin wrapper around `@shopify/react-native-skia`'s own `LoadSkiaWeb` (imported from its `/src/web` subpath), which fetches the CanvasKit WASM build Skia's web target renders through. Metro's platform-extension resolution (this file vs. `loadSkiaWeb.ts`) is what keeps this out of the native bundle. |
| `ReadyButton.tsx` | Per-player or standalone ready toggle — outlined until ready, then fills solid with the player's own color. |
| `PressAwayOverlay.tsx` | Invisible full-bleed `Pressable` for press-away-to-close. Rendered as an early sibling of real content so paint order keeps every real control directly tappable; only genuinely empty space falls through to it. |
| `fonts.ts` | `MONO_FONT` — the system-monospace default every component's `labelFontFamily` prop falls back to. |
| `index.ts` | Public export barrel — see Public API below. |

### Why `SkiaGate` exists, and why it also has its own subpath export

Before this was extracted (2026-09), at least 7 apps in the fleet (ArcheryDuel, Asteroids, RampantRats,
Ember-Vein, HexFleet, FreeRide, HowBig) each carried their own hand-copied `SkiaGate.tsx`/
`SkiaGate.web.tsx` pair for lazily mounting a Skia-drawn board/component behind CanvasKit readiness on
web — the exact same problem `TriggerGaugeHost.tsx` already solved internally, just never generalized
or shared. The copies had drifted: some (HexFleet, Asteroids) still used a `React.lazy()`-based
version with a known, unfixed `react-hooks/static-components` lint error; others had independently
rewritten around it. `SkiaGate`/`SkiaGate.web.tsx` here are that fix, generalized once and shared —
`TriggerGaugeHost.tsx` was rewritten on top of them as proof (and to stop carrying its own bespoke
copy of the same mechanism). A consuming app's own local `SkiaGate.tsx`/`SkiaGate.web.tsx` should be
deleted in favor of importing this instead.

**Import `SkiaGate` from `@tastic/hud/skia-gate`, not the bare `@tastic/hud`.** Both work at compile
time, but they are not equivalent at runtime. The package's main `"."` export routes through
`src/index.ts` — a single barrel re-exporting every component in this kit, several of which (
`ReadyButton`, `BaseSettingsDialog`, `ControlSchemePicker`, etc.) import `@rific/feedback-press` and/or
`@tastic/core`. Under this fleet's shared tsconfig (`customConditions: ["react-native"]`, matching
Metro's own real resolution), *both* `tsc` and Metro follow the package's `"react-native"`/`"browser"`
export conditions straight to that raw barrel — not the compiled `dist/`. A consumer that only wants
`SkiaGate` and doesn't otherwise depend on `@rific/feedback-press`/`@tastic/core` (Ember-Vein, HowBig)
hits real failures either way: `tsc` fails typecheck on the raw `.tsx` source needing those peers, and
—the more serious one, confirmed via an actual `expo export -p web` run, not just typecheck—**Metro
fails to bundle at all**, `Unable to resolve module @rific/feedback-press`, because it independently
resolves the exact same barrel via the exact same export condition. A `tsconfig.json` `paths` redirect
to the compiled `dist/index.d.ts` (the fix tried first, and the same trick already used fleet-wide for
`@shopify/react-native-skia`'s identical resolution quirk) only ever fixes the `tsc` half — `paths` is
TypeScript-only and Metro never consults it for a specifier that already resolves to a real package.

`./skia-gate` (`package.json`'s `exports["./skia-gate"]`, built from its own `src/SkiaGate.tsx` tsup
entry point — see `tsup.config.cjs`) is the real fix: a standalone build reachable without ever
touching `src/index.ts`, so it carries none of the barrel's peer-dependency surface at either
typecheck or bundle time — confirmed by grepping the compiled `dist/SkiaGate.mjs`, which imports
nothing but `react`. Apps that already carry `@tastic/hud`'s full peer set (RampantRats, ArcheryDuel,
Asteroids, FreeRide, HexFleet) don't strictly *need* this subpath — the bare `@tastic/hud` import
works for them today — but all of them were switched to `/skia-gate` anyway for consistency and so a
peer dependency being dropped later (exactly what happened to Ember-Vein) can't silently reintroduce
this failure mode.

**Gotcha if you ever touch `exports["./skia-gate"]` again:** the `"react-native"`/`"browser"` targets
must each name their own file with its real extension (`"./src/SkiaGate.tsx"` for `"react-native"`,
`"./src/SkiaGate.web.tsx"` for `"browser"`) — never the extensionless form (`"./src/SkiaGate"`) used
inside `index.ts`'s own relative `export { SkiaGate } from './SkiaGate'`, and never the *same* file
for both conditions. Metro does not apply its own platform-extension search to an **exports-map
target** the way it does to a plain relative import from already-resolved source: an extensionless
target just fails to resolve at all (confirmed: `Metro ... however this file does not exist. Falling
back to file-based resolution`, then a hard "could not be found" bundling error), and — the costlier
mistake, because it fails silently instead — pointing `"browser"` at the same `SkiaGate.tsx` as
`"react-native"` (what this exports block actually shipped, briefly) resolves fine and typechecks
fine, then crashes every real browser session at the first `SkiaGate` mount:
`ReferenceError: CanvasKit is not defined`, because the native file never calls `LoadSkiaWeb()`.
Grepping the bundle for `CanvasKit`/`canvaskit` as a presence check is **not** a valid way to verify
this — it was tried, found 363 hits, and was wrong. Any consumer's own direct
`@shopify/react-native-skia` import (e.g. a Skia `<Canvas>` inside whatever component `SkiaGate` lazy-
mounts) references that same API surface regardless of which `SkiaGate` file got bundled, so its
presence proves nothing about `WithSkiaWeb` specifically. The only real check is exporting for web and
actually clicking through to the `SkiaGate`-mounted screen in a browser and watching the console.

### `getInlineColorPickerContentSize` (2026-09-18)

A fleet-wide drift scan found that `PlayerSetupPanel`'s existing `colorAlignOverride` prop (forwarded straight into `InlineColorPicker`'s own `alignOverride`, exactly the same plumbing `cpuDifficultyAlignOverride` already had for the CPU-difficulty dropdown) was never actually wired up by any of the 5 consuming apps — a real bug, not a documentation gap, since the color picker (unlike the CPU-difficulty picker, a confirmed no-op everywhere) genuinely renders inside a live `@tastic/split-screen` zone in every app's two-human-player mode. The missing piece was a way for a caller to compute the popover's own content size ahead of render, the same job `LabeledDropdown`'s `getLabeledDropdownContentHeight` already does for that picker — `InlineColorPicker` had no equivalent export, just an internal computation.

Added `getInlineColorPickerContentSize(swatchCount, windowWidth, columns?): { width, height }`, exported alongside `InlineColorPicker`. Unlike `getLabeledDropdownContentHeight` (which only depends on a static option count), this one also takes `windowWidth` explicitly — the picker's own auto-column clamp depends on window width, and a caller computing this ahead of the picker's own mount has no component instance to read `useWindowDimensions()` from. `InlineColorPicker`'s own internal computation now calls this same function (removed the duplicated inline formula), so there's exactly one place this math lives. Now `0.9.1` (patch, no breaking change — this is a new export only; no app was wired to use it as part of this fix, see each app's own CLAUDE.md for that follow-up).

### `useZoneClampedAlign` rotation threading (2026-09-18)

`useZoneClampedAlign` gained a `rotation: PopoverRotation = 0` fourth parameter, threaded straight into its internal `useAutoAlign` call — low-risk, since it only ever reaches `useAutoAlign`'s own already-rotation-aware horizontal-align decision (verbatim, via the `if (!zone) return auto` fallback whenever the hook is used outside a zone). `PlayerSetupPanel` gained a matching `colorRotation?: PopoverRotation` prop, forwarded to its internal `InlineColorPicker`'s own `rotation` prop.

While threading it, the hook's own doc comment was found to be actively wrong — it claimed `measureInWindow` "resolves post-transform," the same false claim `useAutoAlign.ts` itself already documents as having shipped one real, unnoticed bug (measureInWindow reports the PRE-transform frame). The comment was rewritten to correct that and to honestly document a real, currently-unfixed gap this hook still has: it never applies `useAutoAlign`'s own `rotateRect(...)` correction to its raw `measureInWindow` read, so `awayRoom`/`towardRoom` are computed from the uncorrected frame. A full fix would also need `@tastic/split-screen`'s `DualZoneLayout.measureShared` corrected in tandem (`sharedEdgeY` has the identical gap) — `zone.rotated` alone isn't sufficient to fix just this hook's half, since it captures a trigger's own net rotation, not the outer ambient rotation `sharedEdgeY`'s own correction would need, and the two don't compose simply. Deliberately left unfixed rather than guessing at unverified trigonometry across a third package: confirmed every real `cpuDifficultyAlignOverride` call site across the fleet is a no-op today (never actually rendering inside a live `DualZoneLayout` zone), so nothing currently miscalculates in practice — but this needs real rotated-zone test coverage before either hook's math under live rotation is trustworthy.

### `useQuitConfirmation` (2026-09-18)

New hook, `src/useQuitConfirmation.ts`, capturing the `onBackPress` + `<ConfirmDialog>` "Quit
Match?" pattern every fleet `game.tsx` already hand-wired (Snake, AirHockey, BoxHockey, Pong,
LightCycles): interrupt backing out of a match with a confirmation only when there's progress worth
losing, otherwise back out immediately. Returns `{ confirmVisible, requestBack, cancelBack }` —
wire `confirmVisible`/`cancelBack` straight to `<ConfirmDialog visible={...} onCancel={...}>`,
`requestBack` to the back button's `onPress`. Deliberately does not own or render the
`<ConfirmDialog>` itself — title/message/icon/confirmLabel/cancelLabel/rotation stay authored at
each call site (a score pairing in most apps, a `<RoundHistoryPips>` component in LightCycles),
matching this package's established "hooks return data, JSX stays at the call site" convention
(`usePopoverHost`, `useAutoAlign`, `useZoneClampedAlign` all do the same). Exported, with its
`QuitConfirmation` type, from `src/index.ts`; covered by `src/__tests__/useQuitConfirmation.test.ts`.

**The signature is `hasProgress: () => boolean`, a lazy getter — not the plain `boolean` the
original design called for — and that's a real, load-bearing correction made after initial
implementation, not a stylistic choice.** The version of this hook worked out before implementation
took `hasProgress: boolean`, computed fresh by the caller on every render, exactly like each app's
own pre-extraction `onBackPress` closure already did. That looked safe until it was actually wired
into AirHockey, BoxHockey, and Pong — all three fold this hook's own `confirmVisible` into a
`paused = settingsOpen || confirmVisible` that gates `useGameState(paused)`, and `useGameState`'s
*return value* (scores, lives, bricks) is exactly what each app's `hasProgress` expression needs to
read. A plain-boolean argument forces that read to happen before `useGameState` has run on that
render: `confirmVisible → paused → useGameState(paused) → {scores/lives/bricks} → hasProgress →
confirmVisible` — a genuine circular render dependency, not just an ordering inconvenience. All
three apps hit this independently and worked around it with their own bespoke one-commit-behind
shadow state (reading last render's scores instead of the current one), converging on the same fix
under three different names — which was itself the signal that the hook's *contract* was wrong, not
that three call sites each needed their own patch.

The fix: `hasProgress` became a lazy `() => boolean` getter, and both it and `onConfirmedBack` are
mirrored into refs via this fleet's standard effect-based idiom — `useRef` seeded once, then kept
current by a bare `useEffect(() => { ref.current = value })` with **no dependency array** (runs
after every commit, not just on mount) rather than a render-time assignment, the same convention
`@rific/core`'s `createSettingsContext.tsx` uses for the same reason. `requestBack` reads
`hasProgressRef.current()` at tap time, not at the render that defined it, which defers the read
past the point where `useGameState`'s own output actually exists — exactly mirroring how the
original hand-rolled version in every app read scores/bricks/lives fresh from its own `onBackPress`
closure rather than needing the value threaded in earlier. This also gives `requestBack`/
`cancelBack` a stable identity across every render (empty deps on both `useCallback`s), which the
plain-boolean version couldn't offer — a changing `hasProgress` value would have forced
`requestBack`'s own deps array to include it, producing a new function identity on every render
where progress state changed.

Snake and LightCycles never had this circular dependency (their `hasProgress` expressions don't
route through a `paused`-gated `useGameState`), so for them the lazy-getter signature is a no-op
wrapper around the same expression they'd otherwise have passed directly. The correction exists for
AirHockey/BoxHockey/Pong's shape specifically, but the signature is uniform across all 5 call sites
— there's no partial/conditional API here, and there shouldn't be one: a caller with no circular
dependency today can still acquire one later (a refactor that moves score state behind the same
`paused` gate), and the lazy-getter signature costs nothing for the apps that don't currently need
it.

### `AchievementCatalogSection` + `ActivityStatSection` (2026-09-18)

Two new presentational components landing the achievements-scaffolding extraction, paired with
`@tastic/achievements`'s own new `catalogRows.ts` (`AchievementCatalogRow`,
`getAchievementCatalogRows`, `defaultFormatUnlockedLabel`) added in the same pass. The split mirrors
this package's existing `AchievementRow` (hud, presentational, fully-precomputed props) /
`achievementEngine.ts`-shaped (achievements, pure data) boundary — `@tastic/achievements` is
headless by design (its own CLAUDE.md: "nothing here renders," zero react-native/Paper peer deps),
so the row-computation logic reading `ACHIEVEMENT_CATALOG`/`unlockedAchievements`/stats lives there,
and the two components that actually render the result live here.

- **`AchievementCatalogSection.tsx`** — the "ALL ACHIEVEMENTS" `labelMedium` heading (`MONO_FONT`,
  `letterSpacing: 2`) plus one `<AchievementRow>` per `AchievementCatalogRow` in `rows`. Extracted
  byte-for-byte from every fleet app's own `achievements.tsx` (Snake, AirHockey, BoxHockey, Pong,
  LightCycles). Returns a `Fragment`, not a `View` — every call site rendered the heading and rows
  as flat siblings inside `BaseStatsScreen`'s own gap-spaced `ScrollView` content, and a wrapping
  container here would double up that spacing. Resolves each row's locked-vs-unlocked `badgeColor`
  here (`row.tierColor` when `row.unlockedAt !== undefined`, else `LOCKED_BADGE_COLOR`) rather than
  upstream, matching `AchievementRow`'s own "badge color is a rendering decision" doc comment —
  `@tastic/achievements`'s `getAchievementCatalogRows` deliberately leaves `tierColor` unresolved
  for the same reason.
- **`ActivityStatSection.tsx`** — the "ACTIVITY" `<StatSection>` (Days Played / Day Streak / Best
  Day Streak), also extracted byte-for-byte from the same 5 apps. Takes a plain structural
  `ActivityStats { distinctDaysPlayed, currentDayStreak, bestDayStreak }` interface, deliberately
  *not* `@tastic/achievements`'s own `DayStreakState` type even though the shapes match — this
  component has zero dependency, not even type-only, on `@tastic/achievements`; any caller's own
  stats object satisfying the structural shape works. This is the asymmetric half of the split:
  unlike `AchievementCatalogSection`, nothing here needed the sibling package at all.

**Verified against current source, not the original design doc: `AchievementCatalogRow` is a real
type-only import today, not a locally-duplicated one.** The design worked out before
`@tastic/achievements` had shipped `catalogRows.ts` anticipated `AchievementCatalogSection` briefly
carrying its own local copy of the `AchievementCatalogRow` interface as a stopgap until the sibling
package caught up. That stopgap is not what's in the repo now — `AchievementCatalogSection.tsx`
line 2 is `import type { AchievementCatalogRow } from '@tastic/achievements'`, and the file's own
comment (lines 10–13) records that the shapes were checked against each other before this real
dependency was wired in: "no longer duplicated locally now that package has actually published the
export (confirmed the two shapes match exactly before wiring this real, type-only peer
dependency)." `@tastic/achievements` is now a declared `peerDependency` here (`>=0.2.0`, the first release exporting `AchievementCatalogRow` — see Peer
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

### The press-away pattern for split-screen (no component for this — it's a wiring pattern)

A single full-screen `PressAwayOverlay` works for one player. For two players sharing a screen, the
"broadest zone" owner's overlay covers the whole screen, and every other player's zone-scoped
overlay must stay mounted (shielding, even if not actually closing anything) whenever *any*
host with broader reach is open — not just their own — or a tap on their own side can fall through
and close the other player's popover. See the package README for the full code example; this isn't
enforced by any component here, since the zone rectangles are always specific to the consuming
app's own layout.

### The guide subpath — `@tastic/hud/guide` (2026-09-19)

A paged, skippable "how to play" flow (`src/guide/`): `HowToPlayDialog` (controlled card), `GuideProvider` +
`useGuide()` + `useAutoShowGuide()` (context, once-per-session auto-show), `createGuideSlice` (the persisted
"seen version" flag), `createReturningPlayerMigrate` (see below), and the shared illustrations `SwipeHint` (finger or
`pointer='mouse'`), `DirectionKeysHint` (inverted T, or `axis='vertical'`), `SeatDiagram` and `SeatDevicesHint`. Built exactly like `./skia-gate`
and for the same reason — a standalone tsup entry (`src/guide/index.ts` → `dist/guide/index.*`; esbuild keeps
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
without it, Hangman (no Skia, no `@tastic/core`), is exactly why the subpath must stay light.

**The import boundary is load-bearing.** Nothing under `src/guide/` may import `@tastic/core`,
`@tastic/profile`, `@tastic/split-screen`, `@tastic/achievements`, `@rific/updater`, Skia, or the main barrel.
Those six are `optional` in `peerDependenciesMeta` (that's what lets Hangman install hud without them), and
`src/__tests__/guideImports.test.ts` asserts the source-level boundary — the unit tests above it mock every
peer and would never catch a regression here; it would surface as a broken Hangman bundle. The one borrowed
module, `src/overlayCard.ts`, imports only `react-native` (also asserted). Because it can't import
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
  Home without a provider don't break — at the cost that a missing provider fails silently (a dead row).
- **Jest mocks:** the `react-native` mock's `ScrollView` is still a plain `jest.fn` (InlineColorPicker's test
  reads `ScrollView.mock.calls`) but now attaches a `scrollTo` imperative handle via the React 19 `ref`-as-prop;
  it also gained `BackHandler`. The reanimated mock gained `useReducedMotion`, `withRepeat`, `withSequence`.
  Import the `mock*` helpers from `../__mocks__/react-native`, not `'react-native'`, so TypeScript sees them.
- **Never `yalc push` from this repo.** It publishes and then updates *every* project registered in yalc's
  store for this package (`~/.yalc/installations.json`), rewriting their `package.json` to `file:.yalc/...`.
  Use `yalc publish` here and `yalc link @tastic/hud` (no `package.json` change) in the one app you're testing.

## Public API

The complete `src/index.ts` export barrel, reachable at the package's main `"."` entry point.
`package.json`'s `exports` map also has one subpath, `"./skia-gate"` — the standalone `SkiaGate`
build, with none of this barrel's peer-dependency surface (see "Why SkiaGate exists" above for why
that's a real, not cosmetic, difference). Prefer `import { SkiaGate } from '@tastic/hud/skia-gate'`
over pulling it from the bare `'@tastic/hud'` barrel below, even in an app that already has every
peer this kit needs.

```ts
export { MONO_FONT } from './fonts'
export { ControlSchemePicker, type ControlSchemePickerProps } from './ControlSchemePicker'
export { InlineColorPicker } from './InlineColorPicker'
export { loadSkiaWeb } from './loadSkiaWeb'
export { PopoverBody } from './PopoverBody'
export { PressAwayOverlay } from './PressAwayOverlay'
export { ReadyButton } from './ReadyButton'
export { type MenuOption, type MenuSection, type MultiSelectSection, SectionedDropdown, type SingleSelectSection } from './SectionedDropdown'
export { SkiaGate, type SkiaGateProps } from './SkiaGate'
export type { TriggerGaugeProps } from './TriggerGauge'
export { default as TriggerGaugeHost } from './TriggerGaugeHost'
export { type PopoverAlign, type PopoverVerticalAlign, useAutoAlign } from './useAutoAlign'
export { type PopoverHost, usePopoverHost } from './usePopoverHost'
```

(This list — and the rest of this doc's Architecture/Testing sections below — was already missing
several real exports, e.g. `AchievementRow`, `BaseSettingsDialog`, `BaseStatsScreen`, `ContentGutter`,
`CornerActionButtons`, `LabeledDropdown`, `SharedActionBand`, `StatRow`, `StatSection`, before this
edit; only `ControlSchemePicker` was added here, so it's still not a complete/accurate barrel — cross-
check `src/index.ts` directly rather than trusting this list exhaustively. Also now missing, as of
the 2026-09-17 `alignOverride`/zone-awareness pass (see README's "Zone-aware popovers" section for
the full story): `AlignResult`, `getColorPopoverId`, `getCpuDifficultyPopoverId`, `PlayerSetupPanel`,
`useZoneClampedAlign`. Also now missing, as of the 2026-09-18 achievements-scaffolding +
`useQuitConfirmation` passes (see Architecture above): `AchievementCatalogSection`,
`ActivityStatSection`, `QuitConfirmation`, `useQuitConfirmation` — this doc's own staleness
compounding is itself evidence for cross-checking `src/index.ts` directly rather than trying to keep
patching this list forward piecemeal.)

`TriggerGauge` itself (the raw Skia component) is deliberately **not** exported — only its type
(`TriggerGaugeProps`) is. A value re-export would force the bundler to fold `TriggerGauge.tsx`'s own
eager `Skia` import into a chunk shared with `TriggerGaugeHost`'s lazy dynamic import, defeating the
lazy-load split for every consumer on every platform. `TriggerGaugeHost` is the only supported way to
render it.

## Peer Dependencies

Real `peerDependencies` from `package.json`, with their actual version floors:

**External:**
- `react` — `>=19.0.0`
- `react-native` — `>=0.76.0`
- `react-native-paper` — `>=5.0.0` (`Icon`, `Text`)
- `react-native-reanimated` — `>=3.0.0` (`Easing`, `useDerivedValue`, `useSharedValue`, `withTiming` — `TriggerGauge.tsx` only)
- `@shopify/react-native-skia` — `>=1.5.0` (`Canvas`, `Path`, `Skia` in `TriggerGauge.tsx`; `LoadSkiaWeb` via its own `/src/web` subpath in `loadSkiaWeb.web.ts`)

**Internal fleet:**
- `@rific/auto-paper` — `>=0.9.4`, the first release with `AutoAppearancePicker` (`AutoAppearancePicker`, `defaultColors`, `getContrastColor`, `getBlendedColor`, `getColorRoles`, `SeedColor`)
- `@rific/feedback-press` — `>=0.10.2`, the first release with `useSoundSettings` (`IconButton`, `TouchableRipple`, `useSoundSettings`)
- `@tastic/achievements` — `>=0.2.0` (`AchievementCatalogRow` type, in `AchievementCatalogSection.tsx`
  only — type-only, no value/runtime import; see "AchievementCatalogSection + ActivityStatSection"
  above). The newest peer here (added in the same 2026-09-18 pass as that component) and currently
  resolved via yalc (`file:.yalc/@tastic/achievements` in `devDependencies`) rather than a real
  npm-published version.
- `@tastic/core` — `>=0.1.0` (`clamp`, `useIsTouchPrimaryDevice`)

None of these are bundled — consumers use whatever versions their app already has. This repo also
declares each of the nine peers above as a `devDependency` (own dev/test/build, at or above the
floor) so lint/typecheck/test/build have something real to run against.

Unrelated to the peer deps above — the fleet's own shared tooling, pulled in as plain
`devDependencies`: `@infinitetoken/eslint-config@^0.1.8`, `@infinitetoken/jest-config@^0.2.0`,
`@infinitetoken/tsconfig@^0.3.0`.

## Testing

- **Framework:** Jest (via `@infinitetoken/jest-config/react-native`, jsdom environment) + `ts-jest`
  (bundled by the shared preset, not a direct dependency of this repo) + `@testing-library/react`
- **Location:** `src/__tests__/*.test.ts`
- **Mocks:** `src/__mocks__/` — `react-native`, `react-native-paper`
- **Current suite** (as of the `SkiaGate` addition, 2026-09): 24 test files, 160 tests, all passing —
  now covers component rendering too, not just hooks (this doc previously said otherwise; that was
  already stale before this edit).
- **Coverage** (`npm test`, freshly run): ~99.6% statements / ~90% branches / ~99% functions overall
  — comfortably clears the fleet shared preset's own default 70% threshold (genuinely enforced —
  `collectCoverage: true` in the shared config, not just documented), so `jest.config.cjs` carries no
  local `coverageThreshold` override at all. If one gets added back for a genuine gap, don't set it
  below what real coverage already achieves.
- When adding new hook behavior, add a corresponding test case.

## Code Style

Enforced entirely by the shared `@infinitetoken/eslint-config/react-native` preset (`eslint.config.cjs`
is a bare `module.exports = require('@infinitetoken/eslint-config/react-native')` — no local
overrides) and its bundled Prettier config (`package.json`'s `"prettier"` field points at
`@infinitetoken/eslint-config/prettier`). Run `npm run lint` before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**Non-default ESLint rules (traced through to the shared preset's source):**
- `simple-import-sort/imports`, `simple-import-sort/exports` — warn
- `react-native/no-inline-styles`, `react-native/no-unused-styles` — warn (`react-native/no-raw-text` is explicitly off)
- `no-console` — warn
- `react-hooks/rules-of-hooks` — error; `react-hooks/exhaustive-deps`, `react-hooks/refs`,
  `react-hooks/immutability`, `react-hooks/preserve-manual-memoization`, `react-hooks/set-state-in-effect` — warn
- `@typescript-eslint/no-unused-vars` — warn, but a `_`-prefixed name (var/arg/caught-error) is
  exempt fleet-wide (e.g. `const { id: _id, ...rest } = obj`)
- `@typescript-eslint/no-require-imports` — off
- `package-json/order-properties`, `package-json/sort-collections` — warn, on `package.json` itself
- Test/mock files (`__tests__/`, `__mocks__/`) are linted like any other source, except
  `@typescript-eslint/no-explicit-any` is off there

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
