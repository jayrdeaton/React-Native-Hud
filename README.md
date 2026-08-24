# @tastic/hud

Visual component kit for local-multiplayer React Native games — inline (non-modal) popovers,
dropdowns, color pickers, gauges, ready buttons, and dialogs. Every interactive piece stays scoped
to one player's own zone on a shared screen, so it never blocks the rest of the screen the way a
full-screen modal would.

Sibling to [`@tastic/split-screen`](https://github.com/jayrdeaton/react-native-split-screen), the
two-player layout/orientation engine this kit's components are built to render correctly inside —
in particular, `PopoverBody`'s positioning survives an ancestor's 180° rotation. Neither package
depends on the other; they compose at your own screen.

## Why not a modal?

A full-screen `Dialog` blocks the whole screen. In a two-player lobby that's a non-starter — player
2 can't touch anything while player 1's color picker is open. Every popover here renders **inline**,
as an absolutely-positioned sibling of its own trigger, so it never blocks anything outside its own
corner of the screen.

## What's in here

- **`usePopoverHost()`** — tracks which *one* popover (by id) is open within a group, so opening one
  closes any sibling already open in the same group.
- **`PopoverBody`** — the low-level popover shell (position, caret, alignment). `SectionedDropdown`
  and `InlineColorPicker` are built on it.
- **`useAutoAlign`** — measures a trigger's actual on-screen position and picks whichever alignment
  (left/right/center, above/below) keeps a popover from overflowing a screen edge — including a
  `maxHeight` for the caller to cap content and scroll when neither direction has enough room.
- **`SectionedDropdown`** — a popover holding any mix of single-select ("pick one", radio-style) and
  multi-select ("pick some", checkbox-style, optional all/clear footer) sections, divided by rules.
- **`InlineColorPicker`** — swatch-grid color popover, auto-sized columns, with an optional "taken"
  color (shown disabled, or swappable).
- **`TriggerGauge`** — decorative ring of tick marks around a trigger, showing which option(s) are
  active without opening the popover.
- **`ReadyButton`** — a per-player or standalone ready toggle.
- **`PressAwayOverlay`** — an invisible full-bleed tap-catcher for press-away-to-close. This is the
  one piece that needs care in a split-screen layout — see below.

## The press-away pattern (read this before wiring it up)

A single full-screen `PressAwayOverlay` works fine for a one-player screen. It does **not** work
for a two-player split screen: if player 1's press-away covers the whole screen, then any tap on
player 2's side — even one that has nothing to do with player 1 — falls through and closes player
1's popover. That defeats the point of letting both players drive their own settings at once.

The fix is two overlays with an asymmetric relationship, not two independent halves:

```tsx
const p1Host = usePopoverHost()
const p2Host = usePopoverHost()

return (
  <View style={styles.container}>
    {/* Player 1's overlay covers the ENTIRE screen. This is correct even though player 1 visually
    only owns "their side" — any shared-settings row that reads as "player 1's" (see your own
    layout) may not stay confined to a literal half of the screen, and this overlay needs to cover
    everywhere player 1 might have something open. */}
    <PressAwayOverlay active={p1Host.openId !== null} onPress={p1Host.close} />

    {/* Player 2's overlay is scoped to just their own zone (half the screen, whichever side
    they're on — see @tastic/split-screen's panelLayout for how to size this) — and, being a later
    sibling, it paints on top of player 1's overlay within that rect, so a tap there is always
    player 2's to own.

    Critically: this has to mount whenever EITHER host is open, not just p2Host. If it only mounted
    for p2Host, then closing player 2's popover would unmount it — exposing player 1's full-screen
    overlay underneath for the rest of that render, and the next tap anywhere on player 2's side
    (even if player 2 has nothing open) would fall through and close player 1's popover instead.
    Mounting it any time p1Host is open too "shields" player 2's zone from player 1's overlay
    unconditionally; its onPress (p2Host.close) is just a harmless no-op when p2Host is already
    closed. */}
    <PressAwayOverlay active={p1Host.openId !== null || p2Host.openId !== null} onPress={p2Host.close} style={styles.p2Zone} />

    {/* Real content goes after both overlays — plain paint order (later siblings on top) is what
    keeps every real trigger/button directly tappable; only genuinely empty space falls through to
    the overlays above. */}
    <Player1Panel host={p1Host} />
    <Player2Panel host={p2Host} style={styles.p2Zone} />
  </View>
)
```

The general rule for N players: the "owner" of the broadest zone (usually whoever's panel absorbs
your shared/global settings) gets the whole-screen overlay; every other player's zone-scoped overlay
must stay mounted (shielding, if not actually closing anything) whenever *any* host with broader
reach is open — not just their own.

## Install (local dev via yalc)

Not published to the public npm registry yet.

```bash
cd react-native-hud
npm run build
yalc publish

cd ../your-game
yalc add @tastic/hud
npm install
```

Re-run `npm run build && yalc push` from this package after any change to propagate it to every
linked consumer at once.

## Peer dependencies

`react`, `react-native`, `react-native-paper` (`Icon`, `IconButton`, `Text`), `@rific/auto-paper`
(`defaultColors`, `getContrastColor`, `getBlendedColor`, `SeedColor`), `@rific/feedback-press`
(`IconButton`, `TouchableRipple`) — none of these are bundled, so use whatever versions your app
already has.
