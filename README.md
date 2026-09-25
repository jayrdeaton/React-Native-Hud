# @tastic/hud

Visual component kit for local-multiplayer React Native games — inline (non-modal) popovers,
dropdowns, color pickers, gauges, ready buttons, and dialogs. Every interactive piece stays scoped
to one player's own zone on a shared screen, so it never blocks the rest of the screen the way a
full-screen modal would.

Depends on [`@tastic/core`](https://github.com/jayrdeaton/react-native-game-core) for live device-
rotation tracking (see Rotation below) — every popover/dialog here reads it directly, so it stays
legible even rotated 180° inside a [`@tastic/split-screen`](https://github.com/jayrdeaton/react-native-split-screen)
zone (that package's own two-player layout engine is what actually owns the rotated zone; this kit
and split-screen don't depend on each other, they just both sit on `@tastic/core`).

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
- **`InlineColorPicker`** — swatch-grid color popover, columns auto-clamped to 4 or 5 (the default
  `swatches` list is exactly 20 colors, so that's the only range that fills every row completely),
  with an optional "taken" color (shown disabled, or swappable). The trigger itself is a `size`-
  configurable circle showing either an `icon` or a short `tag` (e.g. a saved player identity's own
  initial or emoji) — `tag` renders at a larger ratio automatically when it's an emoji, since an
  emoji glyph reads visually smaller than a bold letter at the same font size.
- **`TriggerGauge`** — decorative ring of tick marks around a trigger, showing which option(s) are
  active without opening the popover.
- **`ReadyButton`** — a per-player or standalone ready toggle.
- **`PlayerSetupPanel`** — one panel per player slot in a local-multiplayer loadout/lobby screen: a
  name header (a saved-profile switcher for a human seat, a CPU-difficulty `LabeledDropdown` for a
  non-human one, or a plain label when neither applies), a color picker (`InlineColorPicker`)
  optionally paired with a caller-rendered `secondPicker` slot, and a `ReadyButton` for human seats.
  Ported from five apps' own near-identical `PlayerSetupPanel.tsx`/`LobbyPlayerPanel.tsx`
  (AirHockey, BoxHockey, Pong, LightCycles, Snake), which had all independently converged on this
  exact skeleton. See "The secondPicker slot" below before wiring up that one prop.
- **`CornerActionButtons`** — Back (top-left) + Settings (top-right) icon buttons fixed at a
  screen's rotated corners. This isn't just a loadout/lobby-screen convention — it's the right
  default for *any* screen with top-corner icon buttons, home screens included: every app in the
  fleet still hand-rolls its own trophy/cog `IconButton` pair on the home screen specifically
  instead of reusing this component there, a real (if minor) missed-reuse case worth fixing next
  time one of those screens gets touched. Not the right fit for a screen where the top corners fall
  *inside* one player's own rotated zone (two-player face-to-face) — see `SharedActionBand` for
  that case instead.
- **`StaggeredWord`** / **`getStaggeredWordDuration`** — the letter-by-letter stagger-in animation
  every app's own hero-title screen had hand-rolled independently, identical down to the same 45ms
  stagger, 320ms per-letter duration, and back-ease overshoot. Renders one word/line at a time — a
  caller stacking several words (AirHockey's "AIR"/"HOCKEY", LightCycles' "Light"/"Cycles") renders
  more than one `StaggeredWord` and threads `startIndex` through so the whole wordmark reads as one
  continuous cascade instead of each word restarting its own stagger from zero.
  `getStaggeredWordDuration(letterCount)` is the matching total-duration formula, exported as a
  plain function rather than something read off a ref or hook, so a caller's own follow-on
  animation (a paddle rally, a bouncing puck, a looping trail) can compute once, outside render,
  when the lettering has mostly landed.
- **`PressAwayOverlay`** — an invisible full-bleed tap-catcher for press-away-to-close. This is the
  one piece that needs care in a split-screen layout — see below.
- **`BaseSettingsDialog`** / **`BaseStatsScreen`** / **`ConfirmDialog`** — shared shells for the
  settings sheet, an achievements/stats screen, and a plain confirm-or-cancel dialog, each factored
  out after being independently copied into several games. See Rotation below for how each of these
  (plus `SectionedDropdown`/`InlineColorPicker`) handles rotating inside a `@tastic/split-screen`
  zone.

## Rotation

`SectionedDropdown`, `InlineColorPicker`, `BaseSettingsDialog`, and `BaseStatsScreen` all read the
device's live rotation themselves, via [`@tastic/core`](https://github.com/jayrdeaton/react-native-game-core)'s
`useRotation()` — you don't need to pass anything for a popover/dialog to read correctly no matter
which way the phone is held, as long as your app mounts `@tastic/core`'s `OrientationProvider`
(or `@tastic/split-screen`'s `AccelerometerOrientationProvider`, a compat alias for the same thing)
somewhere above it.

Each of the four also still accepts an explicit `rotation` prop, which overrides the ambient read
when present — reach for it only when a specific instance genuinely needs to differ from the live
app-wide rotation (e.g. a fading, lagged `panelLayout` value mid-transition, rather than the raw
live reading — see `@tastic/split-screen`'s own `DualZoneLayout` docs for why that lag exists).

This matters more than it might look: `useAutoAlign` (what `SectionedDropdown`/`InlineColorPicker`
use to pick left/right/above/below) measures a trigger via `measureInWindow`, which reports the
trigger's **pre-transform** layout position — confirmed against a real rotated screen, not just
reasoned about. Inside a `FakeLandscapeView`-rotated zone (or any other ancestor rotated the same
way — a bare CSS `transform: rotate()`, not a real OS-level orientation change), that pre-transform
position can be nowhere near where the trigger actually is on screen, which is exactly the bug this
rotation-awareness fixes: without it, a popover can pick an alignment for where its trigger *used to
be* before rotating, clipping off the edge it's actually now near instead of the one it was near.

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

## Integrating BaseSettingsDialog

`BaseSettingsDialog` is a shared shell, not a drop-in screen — every one of the five consuming apps
(AirHockey, BoxHockey, Pong, LightCycles, Snake) wraps it in its own local
`src/components/SettingsDialog.tsx` adapter rather than rendering it directly from a route. The
adapter's whole job is to bridge whatever local settings mechanism the app uses onto this package's
fixed prop contract — it should carry no UI of its own beyond that plumbing.

That local mechanism genuinely varies per app. AirHockey/BoxHockey/LightCycles thread a
`settings`/`setSettings` pair in as props from a caller-owned `GameSettings` object (each adapter's
own three call sites already have one in scope for other reasons). Pong reads that same shape off
its own `useGameSettings()` hook internally instead of taking it as props. Snake — the one app in
the fleet with real Redux Toolkit state — reads `lockOrientation`/`deferBottomEdgeGestures` via
`useSelector` and writes them back via `dispatch(gameActions.setLockOrientation(...))` directly
inside the adapter, with nothing threaded through props at all. `BaseSettingsDialog` doesn't care
which of these an app uses: sound, haptics, appearance, and update-checking are identical across
every app and live entirely inside this package now, so `lockOrientation`/`onLockOrientationChange`
and `deferBottomEdgeGestures`/`onDeferBottomEdgeGestures` are the only two settings an adapter
actually needs to source itself, however it does that.

Every adapter also passes `version={release.otaVersion}` (so the dialog's own update-check button
knows what it's currently running) and `onUpdateError`, wired to a real `useToast()` call. Wire this
one up — an adapter that leaves `onUpdateError` unset silently swallows a failed update check
instead of surfacing it anywhere, which is a real bug this fleet actually shipped in one app before
being caught and fixed. If your app has no toast system, route it to whatever your own
error-surfacing convention is; just don't leave it as a no-op.

A minimal adapter, following the shape every current one uses:

```tsx
export function SettingsDialog({ visible, onDismiss, rotation = 0, settings, setSettings }: SettingsDialogProps) {
  const { error } = useToast()

  return (
    <BaseSettingsDialog
      visible={visible}
      onDismiss={onDismiss}
      rotation={rotation}
      version={release.otaVersion}
      lockOrientation={settings.lockOrientation}
      onLockOrientationChange={(value) => setSettings({ lockOrientation: value })}
      deferBottomEdgeGestures={settings.deferBottomEdgeGestures}
      onDeferBottomEdgeGestures={(value) => setSettings({ deferBottomEdgeGestures: value })}
      onUpdateError={(message) => error('Update check failed', message)}
    />
  )
}
```

## Zone-aware popovers (`useZoneClampedAlign`)

`useAutoAlign` — and everything built on it, including `SectionedDropdown`, `InlineColorPicker`, and
`LabeledDropdown` — only knows about the full device window edge. It has no concept of a
`@tastic/split-screen` zone boundary: the shared neutral band between two players' halves, or the
line where one player's zone stops and the other's begins. A popover host that lives entirely
inside one player's zone (rather than centered app-wide, the way `BaseSettingsDialog` is) can end up
choosing an alignment that opens toward the shared band, or overflows past the zone boundary into
the other player's half — not because `useAutoAlign` measured wrong, but because the window edge it
correctly measured against isn't the boundary that actually matters there.

LightCycles hit this for real — its `PlayerSetupPanel`-hosted color/CPU-difficulty pickers live
inside a rotated split-screen zone — and originally built its own local fix for it rather than
waiting for this package to grow zone-awareness. That fix is now `useZoneClampedAlign`, a
first-class export of this package: it wraps `useAutoAlign`'s result and re-derives the vertical
decision (and `maxHeight`) against the zone's real edge, via `@tastic/split-screen`'s
`useZoneBounds()`, instead of the window edge — including correcting for a 180°-rotated zone
inverting `PopoverBody`'s local 'above'/'below' labels relative to their real-world direction.
`@tastic/split-screen` is a peer dependency of this package because of this hook specifically — it's
only ever imported if you actually call `useZoneClampedAlign`.

Same signature and return shape as `useAutoAlign` (`open`, `contentWidth`, `contentHeight` in;
`align`, `verticalAlign`, `maxHeight`, `measured`, `triggerRef` out — exported as `AlignResult`, see
below) so it's a drop-in replacement anywhere `useAutoAlign` is called directly. Outside a
`@tastic/split-screen` zone (`useZoneBounds()` returns `null`), it's a pure passthrough to
`useAutoAlign`'s own decision — safe to reach for even in a component that might or might not end up
inside one:

```tsx
const auto = useZoneClampedAlign(open, POPOVER_WIDTH, contentHeight)
```

`LabeledDropdown`, `SectionedDropdown`, and `InlineColorPicker` all accept the result of the above
via an `alignOverride` prop (typed `AlignResult`, also exported), substituting it wholesale for
their own internal, zone-blind `useAutoAlign` call:

```tsx
<SectionedDropdown id='p1-arena' host={host} sections={sections} accentColor={color} mutedColor={muted} dark={dark} alignOverride={useZoneClampedAlign(open, MENU_WIDTH, contentHeight)} />
```

`ControlSchemePicker` forwards both `alignOverride` and `rotation` straight through to the
`SectionedDropdown` it renders internally, so the same call works there too. `PlayerSetupPanel`'s
own internal color/CPU-difficulty pickers aren't reachable this way (they're not a `ReactNode` slot
your own code renders — see "The secondPicker slot" below), so it exposes `colorAlignOverride` and
`cpuDifficultyAlignOverride` props instead, forwarded straight to `InlineColorPicker`'s and
`LabeledDropdown`'s own `alignOverride` internally. Computing `open` for either one needs that
picker's own popover id, which `PlayerSetupPanel` derives internally from `idPrefix` — call
`getColorPopoverId(idPrefix)`/`getCpuDifficultyPopoverId(idPrefix)` (both exported) rather than
guessing or hardcoding the naming convention yourself:

```tsx
const cpuOpen = host.openId === getCpuDifficultyPopoverId('p2')
const cpuAlign = useZoneClampedAlign(cpuOpen, LABELED_DROPDOWN_POPOVER_WIDTH, getLabeledDropdownContentHeight(cpuDifficultyOptions.length))

<PlayerSetupPanel idPrefix='p2' host={host} cpuDifficulty={difficulty} cpuDifficultyOptions={cpuDifficultyOptions} onCpuDifficultyChange={setDifficulty} cpuDifficultyAlignOverride={cpuAlign} /* ...the rest of your usual props */ />
```

For any other popover-hosting component that might sit inside a split-screen zone, call
`useZoneClampedAlign` directly in place of `useAutoAlign`.

## The secondPicker slot (read this before wiring one up)

`PlayerSetupPanel`'s `secondPicker` is a caller-rendered `ReactNode` slot next to the built-in color
picker, not a fixed prop shape — the five apps this component was extracted from each wanted a
genuinely different second control there (a `ControlSchemePicker`, a raw `SectionedDropdown`, or
nothing at all), so rather than this package baking in one shape most consumers don't need, the
panel just renders whatever `secondPicker` is given, wherever it's given.

If whatever you slot in opens its own popover, pass its popover id as `secondPickerId` too:

```tsx
<PlayerSetupPanel
  idPrefix='p1'
  host={sharedHost}
  color={color}
  onColorChange={setColor}
  swatches={swatches}
  isHuman
  secondPicker={<ControlSchemePicker id='p1-scheme' host={sharedHost} value={scheme} onChange={setScheme} />}
  secondPickerId='p1-scheme'
  dark={dark}
/>
```

Skipping `secondPickerId` when your slotted picker does open a popover is easy to get wrong, and it
fails silently rather than throwing: `PlayerSetupPanel` uses it to decide whether its own
`pickerRow` needs the elevated z-index that lets a popover escape the row's bounds and paint above a
later sibling (the `ReadyButton` beneath it, or another panel next to it — see `pickerRowOpen` in
the component's own source). Without `secondPickerId`, the panel has no way to know your picker's
popover is open, so that elevation never kicks in, and your popover can silently render underneath
sibling content instead of on top of it. If your `secondPicker` never opens a popover of its own (a
plain toggle, static content, or nothing at all), omit `secondPickerId` — there's nothing for it to
track. And if that slotted picker's own popover lives inside a split-screen zone, see "Zone-aware
popovers" above for how to wire `alignOverride`/`rotation` into whatever you construct there.

## Quit confirmation (`useQuitConfirmation`)

Captures the `onBackPress` + `<ConfirmDialog>` "Quit Match?" pattern every fleet `game.tsx` used to
hand-wire on its own (Snake, AirHockey, BoxHockey, Pong, LightCycles): interrupt backing out of a
match with a confirmation only when there's progress worth losing, otherwise back out immediately.

```ts
function useQuitConfirmation(hasProgress: () => boolean, onConfirmedBack: () => void): QuitConfirmation

interface QuitConfirmation {
  confirmVisible: boolean
  requestBack: () => void
  cancelBack: () => void
}
```

Wire `confirmVisible`/`cancelBack` straight to `<ConfirmDialog visible={...} onCancel={...}>`, and
`requestBack` to the back button's `onPress`. The hook deliberately doesn't own or render the
`<ConfirmDialog>` itself — title/message/icon/labels/rotation stay authored at each call site (a
score pairing in most apps, a round-history pip row in LightCycles), matching this package's
established "hooks return data, JSX stays at the call site" convention (`usePopoverHost`,
`useAutoAlign`, `useZoneClampedAlign` all do the same).

**`hasProgress` is a lazy `() => boolean` getter, not a plain `boolean` — this is a load-bearing
correction, not a style choice.** A plain-boolean argument forces the caller to compute it every
render from state that, in several apps, doesn't exist yet at that point in the render.
AirHockey/BoxHockey/Pong all fold this hook's own `confirmVisible` into a
`paused = settingsOpen || confirmVisible` that gates `useGameState(paused)` — and
`useGameState`'s *return value* (scores, lives, bricks) is exactly what `hasProgress` needs to
read. A plain boolean here would create a real circular render dependency:
`confirmVisible → paused → useGameState(paused) → {scores/lives/bricks} → hasProgress →
confirmVisible`. The lazy getter breaks the cycle: `hasProgress` is only invoked inside
`requestBack`, at tap time, well after `useGameState` has already produced that render's state —
the getter's closure just reads whatever `scores` is bound to *by then*, the same way a hand-rolled
`onBackPress` closure always did before this hook existed:

```tsx
// AirHockey's game.tsx — hasProgress reads `scores`, a value useGameState (below) hasn't produced
// yet at the point useQuitConfirmation is called. That's fine: the getter is only ever called from
// inside requestBack, well after this render has finished and `scores` is a real value.
const [settingsOpen, setSettingsOpen] = useState(false)
const { confirmVisible, requestBack, cancelBack } = useQuitConfirmation(() => scores[0] > 0 || scores[1] > 0, safeBack)
const paused = settingsOpen || confirmVisible

const { state } = useGameState(board, scoreToWin, friction, paused)
const { scores } = state

// ...

<IconButton icon='arrow-left' onPress={requestBack} />

<ConfirmDialog
  visible={confirmVisible}
  title='Quit Match?'
  message={`${scores[0]} – ${scores[1]}`}
  confirmLabel='Quit'
  cancelLabel='Cancel'
  onConfirm={safeBack}
  onCancel={cancelBack}
/>
```

A game with no such circular dependency (Snake reads `humanScore`/`opponentScore`, LightCycles
reads `roundHistory.length`) still passes a getter — `() => humanScore > 0 || (opponentScore ?? 0) > 0`
— it's just a plain wrapper around an expression that could have been a bare boolean there; the
signature stays uniform across every call site rather than special-casing the apps that don't
currently need the deferred read.

## Achievements catalog (`AchievementCatalogSection`, `ActivityStatSection`)

Two presentational components for an achievements/stats screen, designed to pair with
[`@tastic/achievements`](https://github.com/jayrdeaton/react-native-game-achievements)'s own
`getAchievementCatalogRows` — the row-computation logic (reading `ACHIEVEMENT_CATALOG`,
`unlockedAchievements`, and stats) lives in that headless package (no react-native/Paper deps of
its own); the two components that actually render the result live here. Mirrors this package's
existing `AchievementRow` (hud, presentational, fully-precomputed props) / achievement-engine-shaped
(pure data) boundary.

**`AchievementCatalogSection`** — an "ALL ACHIEVEMENTS" heading plus one `<AchievementRow>` per
row. Returns a `Fragment`, not a `View`: every call site renders the heading and rows as flat
siblings inside `BaseStatsScreen`'s own gap-spaced `ScrollView` content, and a wrapping container
here would double up that spacing. Resolves each row's locked-vs-unlocked `badgeColor` itself
(`row.tierColor` once `row.unlockedAt` is set, else the locked color) rather than upstream, since
`getAchievementCatalogRows` deliberately leaves that choice to whatever renders the rows.

```ts
interface AchievementCatalogSectionProps {
  rows: AchievementCatalogRow[] // from @tastic/achievements' getAchievementCatalogRows
  label?: string // default 'ALL ACHIEVEMENTS'
  fg?: string
  fgMuted?: string
}
```

**`ActivityStatSection`** — the "ACTIVITY" `<StatSection>` (Days Played / Day Streak / Best Day
Streak). Takes a plain structural `ActivityStats` shape rather than importing
`@tastic/achievements`' own `DayStreakState` type, even though the fields match exactly — this
component has zero dependency, not even type-only, on `@tastic/achievements`; any caller's own
stats object with these three fields satisfies it:

```ts
interface ActivityStatSectionProps {
  stats: { distinctDaysPlayed: number; currentDayStreak: number; bestDayStreak: number }
}
```

Composing both with `@tastic/achievements`' own row computation:

```tsx
import { getAchievementCatalogRows } from '@tastic/achievements'
import { AchievementCatalogSection, ActivityStatSection, BaseStatsScreen } from '@tastic/hud'

const rows = getAchievementCatalogRows(ACHIEVEMENT_CATALOG, deviceStats, statsView, unlockedAchievements, profileId)

return (
  <BaseStatsScreen /* ...your usual props */>
    <ActivityStatSection stats={statsView} />
    <AchievementCatalogSection rows={rows} />
  </BaseStatsScreen>
)
```

`AchievementCatalogSection` and `AchievementUnlockList` (below) are the only places in this package
with a `@tastic/achievements` dependency, and both are type-only (`AchievementCatalogRow`,
`AchievementTier`) — never a value/runtime import. See Peer Dependencies below.

## Achievement unlocks on a result card (`AchievementUnlockList`)

The achievements a match just unlocked, for a game-over or round-over card: one row per
achievement, each with its owner's avatar (the seat's `ProfileChip`, or a plain avatar in the seat's
color for a guest), a tier-colored icon badge, and the title. Rows are listed seat by seat. Renders
nothing when no seat unlocked anything, so it can sit in the card unconditionally.

```tsx
import { ACHIEVEMENT_TIER_COLORS } from '@tastic/achievements'
import { AchievementUnlockList } from '@tastic/hud'

<AchievementUnlockList
  unlocks={seatUnlocks} // Partial<Record<Seat, { id, icon, title, tier }[]>>
  seats={[1, 2]}
  owners={{ 1: { profile: p1Profile, color: p1Color }, 2: { profile: null, color: p2Color } }}
  tierColors={ACHIEVEMENT_TIER_COLORS} // a prop, so @tastic/achievements stays type-only here
/>
```

Optional `fg` (title color, defaults from the theme) and `style` (the list container).

For muted profile colors, mount `@tastic/profile`'s `ProfileColorProvider`: the `ProfileChip`s here
pick it up. A guest seat's avatar draws the `color` you pass as-is, so pass it already muted.

## How-to-play guide (`@tastic/hud/guide`)

A short, skippable, paged "how to play" card that shows once on a fresh install and can be replayed on
demand from Settings. Import it from the **`@tastic/hud/guide` subpath**, not the main barrel: it's a
standalone build that pulls in only `react`, `react-native`, `react-native-paper`,
`react-native-reanimated`, `@rific/auto-paper` and `@rific/feedback-press` — none of Skia,
`@tastic/core`, `@tastic/profile`, `@tastic/split-screen`, `@tastic/achievements` or `@rific/updater`
(all marked optional in `peerDependenciesMeta`), so an app that has none of them can use it. A test
(`src/__tests__/guideImports.test.ts`) fails if any file under `src/guide/` ever imports one.

```tsx
import { createGuideSlice, GuideProvider, SeatDiagram, SwipeHint, useAutoShowGuide, useGuide } from '@tastic/hud/guide'

// 1. A persisted "seen" version — its own slice, mounted under `guide` in your root reducer.
const guide = createGuideSlice({ currentVersion: 1 }) // { actions.markSeen, reducer, selectVersionSeen }

// 2. Once, near the root, wrapping your screens (inside PersistGate + your theme/Paper providers).
//    `rotation` is your game's live fake-landscape rotation (useRotation / getViewRotation).
<GuideProvider
  steps={[{ title: 'Steer Your Cycle', body: 'Swipe up, down, left or right.', art: <SwipeHint direction='up' /> }]}
  currentVersion={1}
  seenVersion={useSelector(guide.selectVersionSeen)}
  onSeen={(v) => dispatch(guide.actions.markSeen(v))}
  rotation={rotation}
>
  <Screens />
</GuideProvider>

// 3. On the Home screen, and nowhere else: opens it once per session for a player who hasn't seen it.
useAutoShowGuide()

// 4. Replay from Settings — BaseSettingsDialog renders a "How to Play" row when this is passed.
const { open } = useGuide()
<BaseSettingsDialog {...props} onShowHowToPlay={open} />
```

- **Existing players are grandfathered.** On a fresh install redux-persist's `REHYDRATE` has no payload;
  an existing player has a payload that simply predates the `guide` key. `createGuideSlice` stamps the
  second with `currentVersion` instead of `0`, so an OTA update never greets them with a tutorial (they
  can still replay it). Only finishing or skipping writes; a replay never does. Bump `currentVersion`
  only for a real controls/rules change — everyone sees it again.
- **If your last shipped build predates your redux-persist store, you also need the migrate.** Those
  players have no root store yet, which looks exactly like a fresh install. Pass the AsyncStorage keys the
  shipped build wrote (read them from the last shipped commit, not today's source):

  ```ts
  const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    migrate: createReturningPlayerMigrate(AsyncStorage, ['pong.settings', 'pong.stats', 'pong.achievements'])
  }
  ```

  No root store but any of those keys present means "played an earlier build": that launch rehydrates
  with an empty payload, which the slice grandfathers. An existing root store passes through untouched.
- **Home only.** Call `useAutoShowGuide()` from the Home screen — that placement is what keeps it from
  firing over a live match or a two-seat loadout, where a single centered card can't be read right-way-up
  by both players. Pass `false` to hold it back (e.g. while a deep link is being handled).
- **Leave the row off during a live match.** Omit `onShowHowToPlay` on any screen where Settings pauses or
  overlays a running game.
- **Content is the app's.** A `GuideStep` is `{ title, body, art? }`; only the app knows its own controls
  and win condition. Shared illustrations for the arcade games: `SwipeHint` (animated finger sweeping
  toward an arrowhead; `pointer='mouse'` for a desktop seat that plays by dragging), `DirectionKeysHint`
  (an inverted-T of key caps, its keyboard counterpart; pass the seat's real keys as `labels`, arrow
  icons when omitted, `axis='vertical'` for up/down-only games), `SeatDiagram` (a phone split into two
  seat-colored halves) and `SeatDevicesHint` (its desktop counterpart: a keyboard and/or mouse, each in
  the color of the seat using it). All take their colors from the theme's primary/secondary by default. Give every
  card an illustration: the pager sizes all pages to the tallest, so a card without one leaves a gap.
- **Fleet copy conventions.** Title Case titles ("Last One Riding Wins"), one-word buttons. The action
  row is ConfirmDialog's (`overlayActionStyles`): outlined Skip (first card only) or Back on the left,
  contained Next on the right, `Ready` on the last card. None of that is configurable: every game gets the identical
  dialog and supplies only its cards (Jay, 2026-09-24: "only their content should be different"). Short bodies,
  and only say what's true in every mode ("your half" is only true in two-player).
- **Not `onboarding`.** LightCycles and Snake already use that word for their 3-2-1-GO countdown.

## Install

Published to the public npm registry as `@tastic/hud`. Everything described above, including the
self-reading rotation behavior on these four components (defaulting to `@tastic/core`'s own
`useRotation()` rather than a plain `0`), `PlayerSetupPanel`, and `StaggeredWord`, is live on npm.

```bash
npm install @tastic/hud
```

## ContentGutter

Caps a play area at `maxContentWidth` and splits the leftover width into two equal gutters
(`leftGutter`/`rightGutter` decorations). The width it clamps against is `@tastic/core`'s
`useRotatedWindowDimensions()`, so under a fake-landscape ancestor (`FakeLandscapeView`: OS window
stays portrait, the screen is only visually rotated) it caps against the swapped, post-rotation width
instead of the never-changing raw window width. It is an exact identity with `useWindowDimensions()`
when no rotation applies.

## Peer dependencies

None of these are bundled, so use whatever versions your app already has. Six are marked `optional` in
`peerDependenciesMeta` only so that an app using just the `@tastic/hud/guide` subpath (Hangman) can
install hud without them. **npm does not install optional peers for you**, so an app that imports the
main `@tastic/hud` entry must list every peer that entry loads in its own `dependencies`, including
the four optional ones marked "main entry" below. Without them, Metro fails to bundle with "Unable to
resolve module".

| Peer | Floor | Needed by |
| --- | --- | --- |
| `react`, `react-native` | >=19.0.0, >=0.76.0 | every entry |
| `react-native-paper` | >=5.0.0 | main entry, `./guide` |
| `react-native-reanimated` | >=3.0.0 | main entry (`StaggeredWord`), `./guide` |
| `@rific/auto-paper` | >=0.9.4 | main entry (`AutoAppearancePicker` first shipped in 0.9.4), `./guide` |
| `@rific/feedback-press` | >=0.10.2 | main entry (`useSoundSettings` first shipped in 0.10.2), `./guide` |
| `react-native-safe-area-context` | >=5.0.0 | main entry (`useZoneClampedAlign`) |
| `@tastic/core` | >=0.5.0, optional | main entry: `useRotation()` and most dialogs; `ContentGutter` needs `useRotatedWindowDimensions()`, first shipped in 0.5.0 |
| `@rific/updater` | >=0.4.0, optional | main entry: `BaseSettingsDialog`, `UpdateDialog` |
| `@tastic/profile` | >=0.4.0, optional | main entry: `PlayerSetupPanel`, `AchievementUnlockList` (`ProfileChip`) |
| `@tastic/split-screen` | >=0.5.0, optional | main entry: `useZoneClampedAlign` |
| `@shopify/react-native-skia` | >=1.5.0, optional | `TriggerGaugeHost`'s gauge (lazy-loaded behind `SkiaGate`) and `./skia-gate` |
| `@tastic/achievements` | >=0.2.0, optional | `AchievementCatalogSection`, `AchievementUnlockList`, type-only (`AchievementCatalogRow`, first exported in 0.2.0; `AchievementTier`) |
