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
| `TriggerGaugeHost.tsx` | The only supported way to render a trigger gauge. `lazy()`-loads `TriggerGauge.tsx` behind `loadSkiaWeb()` so its `Skia`-binding import is never evaluated before Skia is actually ready (real on native, WASM-loaded on web) and never eagerly bundled into this package's own top-level import graph. Default export, re-exported as a named export from `index.ts`. |
| `loadSkiaWeb.ts` | Native counterpart to `loadSkiaWeb.web.ts` — resolves immediately, since Skia-on-native (JSI, no WASM) needs nothing awaited. Must never import `@shopify/react-native-skia/src/web`, even conditionally — see the file's own comment on why Metro would still pull `canvaskit-wasm`'s `require('fs')` into the native bundle graph. |
| `loadSkiaWeb.web.ts` | Web counterpart — thin wrapper around `@shopify/react-native-skia`'s own `LoadSkiaWeb` (imported from its `/src/web` subpath), which fetches the CanvasKit WASM build Skia's web target renders through. Metro's platform-extension resolution (this file vs. `loadSkiaWeb.ts`) is what keeps this out of the native bundle. |
| `ReadyButton.tsx` | Per-player or standalone ready toggle — outlined until ready, then fills solid with the player's own color. |
| `PressAwayOverlay.tsx` | Invisible full-bleed `Pressable` for press-away-to-close. Rendered as an early sibling of real content so paint order keeps every real control directly tappable; only genuinely empty space falls through to it. |
| `fonts.ts` | `MONO_FONT` — the system-monospace default every component's `labelFontFamily` prop falls back to. |
| `index.ts` | Public export barrel — see Public API below. |

### The press-away pattern for split-screen (no component for this — it's a wiring pattern)

A single full-screen `PressAwayOverlay` works for one player. For two players sharing a screen, the
"broadest zone" owner's overlay covers the whole screen, and every other player's zone-scoped
overlay must stay mounted (shielding, even if not actually closing anything) whenever *any*
host with broader reach is open — not just their own — or a tap on their own side can fall through
and close the other player's popover. See the package README for the full code example; this isn't
enforced by any component here, since the zone rectangles are always specific to the consuming
app's own layout.

## Public API

The complete `src/index.ts` export barrel (one entry point — `package.json`'s `exports` map has
only `"."`):

```ts
export { MONO_FONT } from './fonts'
export { ControlSchemePicker, type ControlSchemePickerProps } from './ControlSchemePicker'
export { InlineColorPicker } from './InlineColorPicker'
export { loadSkiaWeb } from './loadSkiaWeb'
export { PopoverBody } from './PopoverBody'
export { PressAwayOverlay } from './PressAwayOverlay'
export { ReadyButton } from './ReadyButton'
export { type MenuOption, type MenuSection, type MultiSelectSection, SectionedDropdown, type SingleSelectSection } from './SectionedDropdown'
export type { TriggerGaugeProps } from './TriggerGauge'
export { default as TriggerGaugeHost } from './TriggerGaugeHost'
export { type PopoverAlign, type PopoverVerticalAlign, useAutoAlign } from './useAutoAlign'
export { type PopoverHost, usePopoverHost } from './usePopoverHost'
```

(This list — and the rest of this doc's Architecture/Testing sections below — was already missing
several real exports, e.g. `AchievementRow`, `BaseSettingsDialog`, `BaseStatsScreen`, `ContentGutter`,
`CornerActionButtons`, `LabeledDropdown`, `SharedActionBand`, `StatRow`, `StatSection`, before this
edit; only `ControlSchemePicker` was added here, so it's still not a complete/accurate barrel — cross-
check `src/index.ts` directly rather than trusting this list exhaustively.)

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
- `@rific/auto-paper` — `>=0.9.0` (`defaultColors`, `getContrastColor`, `getBlendedColor`, `getColorRoles`, `SeedColor`)
- `@rific/feedback-press` — `>=0.10.0` (`IconButton`, `TouchableRipple`)
- `@tastic/core` — `>=0.1.0` (`clamp`, `useIsTouchPrimaryDevice`)

None of these are bundled — consumers use whatever versions their app already has. This repo also
declares each of the eight peers above as a `devDependency` (own dev/test/build, at or above the
floor) so lint/typecheck/test/build have something real to run against.

Unrelated to the peer deps above — the fleet's own shared tooling, pulled in as plain
`devDependencies`: `@infinitetoken/eslint-config@^0.1.8`, `@infinitetoken/jest-config@^0.2.0`,
`@infinitetoken/tsconfig@^0.3.0`.

## Testing

- **Framework:** Jest (via `@infinitetoken/jest-config/react-native`, jsdom environment) + `ts-jest`
  (bundled by the shared preset, not a direct dependency of this repo) + `@testing-library/react`
- **Location:** `src/__tests__/*.test.ts`
- **Mocks:** `src/__mocks__/` — `react-native`, `react-native-paper`
- **Current suite:** 1 test file (`usePopoverHost.test.ts`), 4 tests, all passing — covers only
  `usePopoverHost`'s open/toggle/close logic. Component rendering is intentionally untested (see the
  README).
- **Coverage** (`npx jest --coverage`, freshly run): statements 2.77%, branches 0.89%, functions
  7.4%, lines 2.43% — `usePopoverHost.ts` is the only fully-covered file. `jest.config.cjs` sets a
  local `coverageThreshold` override (`statements: 2, branches: 0, functions: 5, lines: 2`) floored
  just under these real numbers, since the fleet shared preset's own default threshold is 70%
  (genuinely enforced — `collectCoverage: true` in the shared config, not just documented). Raise the
  override as real component tests are added; don't lower it further without a reason.
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
