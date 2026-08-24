# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @tastic/hud

Standalone npm package. Visual component kit for local-multiplayer React Native games: inline
(non-modal) popovers, dropdowns, color pickers, gauges, ready buttons, and dialogs — built so a
control scoped to one player's own zone never blocks the rest of the screen, which is what lets two
players configure their own settings on one shared device at the same time.

Published under the `tastic` npm org — game-specific UI, as opposed to `@rific`'s generic
React Native tooling. Sibling package: `@tastic/split-screen` (`../React-Native-Split-Screen`),
the two-player layout/orientation engine this kit's components are designed to render correctly
inside (in particular, `PopoverBody`'s positioning survives an ancestor's 180° rotation). Neither
package depends on the other — they compose at the consuming app's own screen.

## Commands

```bash
npm run lint      # ESLint + Prettier check
npm run fix       # Auto-fix lint/format issues
npm run typecheck # TypeScript type check (tsc --noEmit)
npm test          # Run all Jest tests
npm run build     # Compile to dist/
```

Always run `npm run lint` before finishing any task.

## Publishing

```bash
npm version patch   # or minor / major — bumps version and creates git tag
git push --follow-tags  # triggers the publish GitHub Action
```

The publish workflow fires on `v*` tags and runs `npm publish` with provenance.

## Local development (yalc)

Not installed from the registry by consuming apps during development — linked via yalc, same as
`@rific/updater` is in this author's other projects:

```bash
npm run build && yalc publish   # from this package
cd ../your-game && yalc add @tastic/hud && npm install
```

Re-run `npm run build && yalc push` after any change to propagate it to every linked consumer.

## Code Style

Enforced by ESLint + Prettier — run the linter before finishing any task.

**Prettier config:**
- Single quotes, JSX single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules (warnings):**
- `simple-import-sort` — imports and exports must be sorted
- `react-native/no-inline-styles` — no inline style objects
- `react-native/no-unused-styles` — no unused StyleSheet entries
- `no-console` — no console statements

## Architecture

### Source files (`src/`)

| File | Purpose |
|---|---|
| `usePopoverHost.ts` | `{openId, toggle, close}` — tracks which one popover is open within a group. One instance per independent editor (e.g. one per player's panel) so opening a popover in one group never affects another. |
| `PopoverBody.tsx` | Low-level popover shell: position (`align`/`verticalAlign`), the connecting caret triangle. Rendered inline as an absolutely-positioned sibling of its trigger — never via Portal — so it inherits any rotation transform the trigger's zone applies. |
| `useAutoAlign.ts` | Measures a trigger's actual on-screen position via `measureInWindow` (resolves post-transform — rotation-safe) and picks whichever `align`/`verticalAlign` keeps a popover of a given size from overflowing a screen edge. Also returns `maxHeight`, the room available in whichever direction it picked, for the caller to cap content and scroll instead of overflowing when neither direction has enough room. |
| `SectionedDropdown.tsx` | Popover holding any mix of single-select ("pick one", radio-style) and multi-select ("pick some", checkbox-style, optional all/clear footer) sections, divided by rules. Covers a plain single-value picker, a multi-select toggle list, or a combined menu (e.g. frequency + which types) — all the same component. |
| `InlineColorPicker.tsx` | Swatch-grid color popover. Auto-computes column count from screen width (3–6 columns). Supports a "taken" color shown disabled or swappable. |
| `TriggerGauge.tsx` | Decorative ring of tick marks around a trigger, showing which option(s) are active without opening the popover. Pure presentational, no popover/host coupling. |
| `ReadyButton.tsx` | Per-player or standalone ready toggle — outlined until ready, then fills solid with the player's own color. |
| `PressAwayOverlay.tsx` | Invisible full-bleed `Pressable` for press-away-to-close. Rendered as an early sibling of real content so paint order keeps every real control directly tappable; only genuinely empty space falls through to it. |
| `fonts.ts` | `MONO_FONT` — the system-monospace default every component's `labelFontFamily` prop falls back to. |
| `index.ts` | Public exports. |

### The press-away pattern for split-screen (no component for this — it's a wiring pattern)

A single full-screen `PressAwayOverlay` works for one player. For two players sharing a screen, the
"broadest zone" owner's overlay covers the whole screen, and every other player's zone-scoped
overlay must stay mounted (shielding, even if not actually closing anything) whenever *any*
host with broader reach is open — not just their own — or a tap on their own side can fall through
and close the other player's popover. See the package README for the full code example; this isn't
enforced by any component here, since the zone rectangles are always specific to the consuming
app's own layout.

### Peer dependencies

- `react`, `react-native`, `react-native-paper` (`Icon`, `IconButton`, `Text`)
- `@rific/auto-paper` — `defaultColors`, `getContrastColor`, `getBlendedColor`, `SeedColor`
- `@rific/feedback-press` — `IconButton`, `TouchableRipple`

None of these are bundled — consumers use whatever versions their app already has.

## Testing

- **Framework:** Jest + ts-jest + `@testing-library/react` (jsdom environment)
- **Location:** `src/__tests__/*.test.ts`
- **Mocks:** `src/__mocks__/` — `react-native`, `react-native-paper`
- Tests cover pure logic (hooks) — component rendering is not tested
- When adding new hook behavior, add a corresponding test case
