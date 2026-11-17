# @tastic/hud

Visual component kit for local-multiplayer React Native games - inline (non-modal) popovers,
dropdowns, color pickers, gauges, ready buttons, and dialogs. Every interactive piece stays scoped
to one player's own zone on a shared screen, so it never blocks the rest of the screen the way a
full-screen modal would.

Works inside a [`@tastic/split-screen`](https://github.com/jayrdeaton/react-native-split-screen) zone:
that package's two-player layout engine turns player 2's half 180° to face them on a face-to-face
screen, and the popovers here draw in place, so they turn with it. Both sit on
[`@tastic/core`](https://github.com/jayrdeaton/react-native-game-core); split-screen never imports this
kit, and this kit imports split-screen only for `useZoneClampedAlign`, an optional peer. The OS turns
the screen itself (see Rotation below).

## Why not a modal?

A full-screen `Dialog` blocks the whole screen. In a two-player lobby that's a non-starter - player
2 can't touch anything while player 1's color picker is open. Every popover here renders **inline**,
as an absolutely-positioned sibling of its own trigger, so it never blocks anything outside its own
corner of the screen.

## What's in here

- **`usePopoverHost()`**: tracks which *one* popover (by id) is open within a group, so opening one
  closes any sibling already open in the same group.
- **`PopoverBody`**: the low-level popover shell (position, caret, alignment). `SectionedDropdown`
  and `InlineColorPicker` are built on it. With the box aligned left or right, the caret keeps its
  base clear of the box's rounded corner (`cornerRadius`, 12 by default, every fleet menu's), so a
  narrow trigger gets a clean outline instead of a jagged notch where the caret crosses the curve.
- **`useAutoAlign`**: measures a trigger's actual on-screen position and picks whichever alignment
  (left/right/center, above/below) keeps a popover from overflowing a screen edge - including a
  `maxHeight` for the caller to cap content and scroll when neither direction has enough room. An
  optional `bounds` View (a scroll view that clips the popover) stands in for the window's edges.
  Its `triggerRef` holds a `ViewInstance` (a View's instance in React Native's legacy and strict
  types alike).
- **`SectionedDropdown`**: a popover holding any mix of single-select ("pick one", radio-style) and
  multi-select ("pick some", checkbox-style, optional all/clear footer) sections, divided by rules.
- **`InlineColorPicker`**: swatch-grid color popover, columns auto-clamped to 4 or 5 (the default
  `swatches` list is exactly 20 colors, so that's the only range that fills every row completely),
  with an optional "taken" color (shown disabled, or swappable). The trigger itself is a `size`-
  configurable circle showing either an `icon` or a short `tag` (e.g. a saved player identity's own
  initial or emoji) - `tag` renders at a larger ratio automatically when it's an emoji, since an
  emoji glyph reads visually smaller than a bold letter at the same font size. `renderSwatch`
  draws the trigger and each grid swatch in place of the flat fill (told `'trigger'` or
  `'swatch'`; null keeps a swatch flat), and `bounds` keeps the popover inside a scroll view it
  sits in (see `useAutoAlign`).
- **`LabeledDropdown`**: a text-label trigger (an uppercase label and a chevron, in the style of
  `@tastic/profile`'s `ProfilePicker`) opening a list whose selected row fills with the seat's
  `color`, for a choice that reads as "who or what you're playing" rather than a game setting.
  `options` are `{ value, label, icon? }`; `align` forces a horizontal alignment and `alignOverride`
  takes a placement of your own (see Zone-aware popovers). `LABELED_DROPDOWN_POPOVER_WIDTH` (180) and
  `getLabeledDropdownContentHeight(optionCount)` give its popover's size, for computing that placement.
- **`TriggerGaugeHost`**: decorative ring of tick marks around a trigger, showing which option(s) are
  active without opening the popover (`SectionedDropdown`'s trigger draws one). The gauge itself
  (`TriggerGauge`, a Skia component) isn't exported, only its `TriggerGaugeProps` type: the host
  loads it when it mounts, so importing `@tastic/hud` never loads Skia (see Skia on web below).
- **`ReadyButton`**: a per-player or standalone ready toggle: an outline and mono label in the seat's
  color until ready, then filled with it. Over a backdrop (a felt) pass `surfaceColor` (the theme's
  surface) and `dark`: it is then a pill the size of `@tastic/profile`'s chip pill, its label black or
  white in the theme's font, filled with the seat's color (its label in that color's own ink) once ready.
- **`PlayerSetupPanel`**: one panel per player slot in a local-multiplayer loadout/lobby screen: one
  seat button, an optional caller-rendered `secondPicker` slot under it, and a `ReadyButton` for human
  seats. A human seat's button is `@tastic/profile`'s `ProfilePicker` and a non-human (CPU) seat's is
  its `OptionPicker` (the difficulty levels), each with the seat's color behind a Color row at the top
  of the same dropdown. A seat with neither picker wired shows a plain label and a separate
  `InlineColorPicker` swatch instead. `colorCaption` adds a short line under the Color row while a
  profile is selected (e.g. `'Snake only'`: the pick is kept in this game, not on the profile), and
  `showColor={false}` leaves the Color row out (e.g. a CPU seat set to "None").
  Ported from five apps' own near-identical `PlayerSetupPanel.tsx`/`LobbyPlayerPanel.tsx`
  (AirHockey, BoxHockey, Pong, LightCycles, Snake), which had all independently converged on this
  exact skeleton. See "The secondPicker slot" below before wiring up that one prop.
  Five optional props fit it to a host that draws on a backdrop (a felt) with muted profile colors,
  each changing nothing when left unset: `nullLabel` (the no-profile row's label in the seat button's
  dropdown, e.g. `'Guest'` beside a `'GUEST'` `guestLabel`), `previewValue` (how the seat's color is
  drawn: the button's chip, its Color row and swatches, the fallback swatch, the plain label and the
  Ready button, while `color` and what `onColorChange` receives stay the saved values), `triggerStyle`
  (the seat button's trigger, e.g. a surface behind its pill), `readySurfaceColor` (the Ready button's
  pill look, `ReadyButton`'s `surfaceColor`) and `useSeatPickerAlign` (a placement
  hook of the host's own for the seat button's dropdown, in place of `useZoneClampedAlign`; it was
  added for a screen turned by `@tastic/core`'s old drawn rotation, which nothing does since core 0.15,
  so a host may no longer need one. Leave it unset inside a split-screen zone, and keep the same hook
  for the panel's life).
- **`CornerActionButtons`**: Back (top-left) + Settings (top-right) icon buttons fixed at a
  screen's rotated corners. This isn't just a loadout/lobby-screen convention - it's the right
  default for *any* screen with top-corner icon buttons, home screens included: every app in the
  fleet still hand-rolls its own trophy/cog `IconButton` pair on the home screen specifically
  instead of reusing this component there, a real (if minor) missed-reuse case worth fixing next
  time one of those screens gets touched. Not the right fit for a screen where the top corners fall
  *inside* one player's own rotated zone (two-player face-to-face) - see `SharedActionBand` for
  that case instead. Each button's touch target is its own 40pt box. Pass the optional `hitSlop`
  (a number or `Insets`, forwarded to both buttons) to grow it without changing anything visible:
  `hitSlop={4}` makes a 48pt target, and the glyphs and press ripple stay as they are. It needs
  `@rific/feedback-press` 0.13.0 or later, whose `IconButton` makes `hitSlop` reach past Paper's
  clipped box (older versions silently ignore it). Omit it to keep the 40pt target. Leave room for
  it: the slop reaches past each button's box, and where it overlaps another touch target,
  whichever is drawn on top gets the press.
- **`CornerStatusBadges`** (main entry only): a quiet 30pt round badge per seat (a dark translucent
  fill, a 16pt near-white icon), pinned 12pt in from a screen corner, holding one icon or nothing.
  It has no opinion on what the icon means (a held power-up in LightCycles and Snake, where it came
  from, or any other per-seat status that's one icon or none). Seat 1 always takes a bottom corner and seat 2 a top one: with `orientationMode='faceToFace'`
  seat 1 is bottom-left and seat 2 top-right whatever `p1OnRight` says; with `'sideBySide'` both
  badges take the right-hand corners when `p1OnRight` is true and the left-hand ones when it's false.
  Omit `p1` or `p2` to draw no badge for that seat; pass `{}` (no `icon`) to draw it empty. It takes
  no touches.

  ```tsx
  import { CornerStatusBadges } from '@tastic/hud'

  <CornerStatusBadges orientationMode={orientationMode} p1OnRight={p1OnRight} p1={{ icon: p1Powerup?.icon }} p2={{ icon: p2Powerup?.icon }} />
  ```
- **`StaggeredWord`** / **`getStaggeredWordDuration`** - the letter-by-letter stagger-in animation
  every app's own hero-title screen had hand-rolled independently, identical down to the same 45ms
  stagger, 320ms per-letter duration, and back-ease overshoot. Renders one word/line at a time - a
  caller stacking several words (AirHockey's "AIR"/"HOCKEY", LightCycles' "Light"/"Cycles") renders
  more than one `StaggeredWord` and threads `startIndex` through so the whole wordmark reads as one
  continuous cascade instead of each word restarting its own stagger from zero.
  `getStaggeredWordDuration(letterCount)` is the matching total-duration formula, exported as a
  plain function rather than something read off a ref or hook, so a caller's own follow-on
  animation (a paddle rally, a bouncing puck, a looping trail) can compute once, outside render,
  when the lettering has mostly landed.
- **`PressAwayOverlay`**: an invisible full-bleed tap-catcher for press-away-to-close. This is the
  one piece that needs care in a split-screen layout - see below.
- **`BaseSettingsDialog`** / **`BaseStatsScreen`** / **`ConfirmDialog`** - shared shells for the
  settings sheet, an achievements/stats screen, and a plain confirm-or-cancel dialog, each factored
  out after being independently copied into several games. `BaseStatsScreen`'s header arrow is labeled 'Back' for screen readers (`backLabel` to change
  it) and takes the same opt-in `hitSlop` as `CornerActionButtons`. On Android, back while a
  `ConfirmDialog` is open calls its `onCancel` and goes no further (with no `onCancel`, it does
  nothing), so it never reaches the screen underneath.
- **`UpdateDialog`**: a drop-in background updater. Mount it once (an app's root layout): it runs its
  own `@rific/updater` `useUpdater()` and, when an update is found, shows a `ConfirmDialog` ("Update
  Available", Restart or Later) instead of the updater's default `Alert`. The message says when the
  update was released the way a person would, to the minute in the device's own locale: "Released
  today at 10:18 AM", "Released yesterday at 4:05 PM", "Released Nov 14 at 9:30 AM", with the year only
  when it isn't this one (0.33.2+). Props: `autoCheck` and `autoPrompt` (both default `true`, passed
  to `useUpdater`) and `onError`.
- **`OverlayCard`** / **`OverlayBackdrop`** / **`useOverlayCardColors`** - the card and dim behind
  `ConfirmDialog` and the how-to-play guide, in the app's own theme colors and blurred when the
  player's Blur setting allows it. See Overlay cards below.
- **`DialogHeader`** / **`useCompactDialog`** / **`DialogHeaderStyleProvider`** - the one header every
  dialog opens with (an icon over a bold title in the theme's primary), the rule for its compact form,
  and a quiet style a game can set for all of them at once. See Overlay cards below.

## Rotation

Nothing in this package turns. The OS turns the screen (since
[`@tastic/core`](https://github.com/jayrdeaton/react-native-game-core) 0.15), so every component lays
out against the window as it is, and `@tastic/split-screen`'s `DualZoneLayout` turns player 2's half
180 for a face-to-face screen, which the popovers drawn inside it turn with. `ContentGutter` (below)
caps against the window's own width.

Up to 0.33 this package followed `@tastic/core`'s drawn rotation (a portrait-locked app drawing its
landscape layout turned 90 or -90) and could turn its own pieces. 0.34 removes all of it:

- The `rotation` prop is gone from `SectionedDropdown`, `InlineColorPicker`, `ControlSchemePicker`,
  `BaseSettingsDialog`, `BaseStatsScreen`, `ConfirmDialog`, `UpdateDialog`, `GuideProvider` and
  `HowToPlayDialog`, and `colorRotation` from `PlayerSetupPanel`. Up to 0.33, `SectionedDropdown`,
  `InlineColorPicker`, `BaseSettingsDialog` and `BaseStatsScreen` defaulted to core's `useRotation()`,
  which core 0.15 made always 0 and core 0.18 removes, so this package needs `@tastic/core` 0.15 or
  later.
- `useAutoAlign(open, contentWidth, contentHeight, bounds?)` and `useZoneClampedAlign(open,
  contentWidth, contentHeight)` lost their `rotation` argument, so `useAutoAlign`'s `bounds` is now the
  fourth. `useCompactDialog()` and `getGuideCardSize(windowWidth, windowHeight)` lost theirs too.
- The `PopoverRotation` and `GuideRotation` types are gone.
- `RotatedFrame` is now `ScreenFrame` (below), without `rotation` or `rotatedSafeArea`.
- `BaseSettingsDialog`'s Lock Orientation row and its `lockOrientation`/`onLockOrientationChange`
  props are gone: with the OS turning the screen there's nothing for the app to pin.
- `ContentGutter` and `useCompactDialog` read the window (`useWindowDimensions()`), where they used to
  read core's `useRotatedWindowDimensions()`.

### `BaseSettingsDialog` lays out in its own frame

The settings sheet renders through one Paper `Portal` into a pass-through `ScreenFrame` (below) with
its own `Portal.Host`, and the Dialog and its update and info cards portal into that host, so the
cards opened from the sheet share one host with it. The frame is mounted at the first open and kept,
so the sheet's close fade plays out.

This needs `@rific/auto-paper` 0.12.2 or later: the Dialog's own body now renders at the portal host,
and only 0.12.2+ mounts that host inside auto-paper's own contexts (blur, Reanimated, defaults).

### `ScreenFrame`

A frame that fills its parent, for a screen or overlay that wants its own `Portal.Host`, pass-through
touches or a capped column:

```tsx
import { ScreenFrame } from '@tastic/hud'

<ScreenFrame portalHost maxContentWidth={640}>
  <StatsList />
</ScreenFrame>
```

- `portalHost`: mount a Paper `Portal.Host` inside the frame, so dialogs lay out in it. Must be static
  per call site: flipping it remounts the contents.
- `passThrough`: let touches fall through the frame's own boxes, for a frame laid over other content.
- `maxContentWidth`: cap the centred content column, in a landscape window only.

Up to 0.33 this was `RotatedFrame`, which also took `rotation` and `rotatedSafeArea` (insets remapped
onto a turned frame's edges). Rename the import and drop both props.

## The press-away pattern (read this before wiring it up)

A single full-screen `PressAwayOverlay` works fine for a one-player screen. It does **not** work
for a two-player split screen: if player 1's press-away covers the whole screen, then any tap on
player 2's side - even one that has nothing to do with player 1 - falls through and closes player
1's popover. That defeats the point of letting both players drive their own settings at once.

The fix is two overlays with an asymmetric relationship, not two independent halves:

```tsx
const p1Host = usePopoverHost()
const p2Host = usePopoverHost()

return (
  <View style={styles.container}>
    {/* Player 1's overlay covers the ENTIRE screen. This is correct even though player 1 visually
    only owns "their side" - any shared-settings row that reads as "player 1's" (see your own
    layout) may not stay confined to a literal half of the screen, and this overlay needs to cover
    everywhere player 1 might have something open. */}
    <PressAwayOverlay active={p1Host.openId !== null} onPress={p1Host.close} />

    {/* Player 2's overlay is scoped to just their own zone (half the screen, whichever side
    they're on - see @tastic/split-screen's panelLayout for how to size this) - and, being a later
    sibling, it paints on top of player 1's overlay within that rect, so a tap there is always
    player 2's to own.

    Critically: this has to mount whenever EITHER host is open, not just p2Host. If it only mounted
    for p2Host, then closing player 2's popover would unmount it - exposing player 1's full-screen
    overlay underneath for the rest of that render, and the next tap anywhere on player 2's side
    (even if player 2 has nothing open) would fall through and close player 1's popover instead.
    Mounting it any time p1Host is open too "shields" player 2's zone from player 1's overlay
    unconditionally; its onPress (p2Host.close) is just a harmless no-op when p2Host is already
    closed. */}
    <PressAwayOverlay active={p1Host.openId !== null || p2Host.openId !== null} onPress={p2Host.close} style={styles.p2Zone} />

    {/* Real content goes after both overlays - plain paint order (later siblings on top) is what
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
reach is open - not just their own.

## Integrating BaseSettingsDialog

`BaseSettingsDialog` is a shared shell, not a drop-in screen - every one of the five consuming apps
(AirHockey, BoxHockey, Pong, LightCycles, Snake) wraps it in its own local
`src/components/SettingsDialog.tsx` adapter rather than rendering it directly from a route. The
adapter's whole job is to bridge whatever local settings mechanism the app uses onto this package's
fixed prop contract - it should carry no UI of its own beyond that plumbing.

That local mechanism genuinely varies per app: one threads a `settings`/`setSettings` pair in as props
from a caller-owned settings object, another reads the same shape off its own hook, another reads and
writes Redux state directly inside the adapter. `BaseSettingsDialog` doesn't care which of these an app
uses: sound, haptics, appearance, update-checking and Keep Awake are identical across every app and
read their own shared settings, so `deferBottomEdgeGestures`/`onDeferBottomEdgeGestures` is the only
setting an adapter actually needs to source itself, however it does that. The pair is optional: omit it
and the Edge Guard row doesn't show.

The Edge Guard row ("Require second swipe") shows on iOS and Android, never on the web. The setting does
nothing on its own: on iOS the app passes it to `@tastic/edge-guard`'s `useEdgeGestureGuard`, and on
Android it spreads `edgeGuardScreenOptions(setting)` over its play screen's options. An app that wires
only the iOS half shows a row on Android that does nothing. `@tastic/shell` wires both for its packs.

The Keep Awake row reads `@rific/core`'s Keep Awake setting (`useKeepAwakeSettings()`), the same way
the Sound row reads `@rific/feedback-press`. It shows on touch-first devices (`@tastic/core`'s
`useIsTouchPrimaryDevice()`) in any app whose `KeepAwakeProvider` was given `expo-keep-awake` (`useExpoKeepAwake()` returns
it), and is hidden otherwise. The app opts in once at its root and calls `useKeepAwake('game')` on the
screen that should stay awake; see `@rific/core`'s README for the bridge.

Every adapter also passes `version={release.otaVersion}` (so the dialog's own update-check button
knows what it's currently running) and `onUpdateError`, wired to a real `useToast()` call. Wire this
one up - an adapter that leaves `onUpdateError` unset silently swallows a failed update check
instead of surfacing it anywhere, which is a real bug this fleet actually shipped in one app before
being caught and fixed. If your app has no toast system, route it to whatever your own
error-surfacing convention is; just don't leave it as a no-op. When the check finds an update, the
Restart/Later card it opens says when the update was released in the same words as `UpdateDialog`'s
prompt ("Released today at 10:18 AM"; 0.34.0+, before which it read "Released 11/17/2026 at
10:18:53 AM").

A minimal adapter, following the shape every current one uses:

```tsx
export function SettingsDialog({ visible, onDismiss, settings, setSettings }: SettingsDialogProps) {
  const { error } = useToast()

  return (
    <BaseSettingsDialog
      visible={visible}
      onDismiss={onDismiss}
      version={release.otaVersion}
      deferBottomEdgeGestures={settings.deferBottomEdgeGestures}
      onDeferBottomEdgeGestures={(value) => setSettings({ deferBottomEdgeGestures: value })}
      onUpdateError={(message) => error('Update check failed', message)}
    />
  )
}
```

A game with music passes `showMusic`, which adds a Music toggle beside Sound and Haptics. It flips
`@rific/feedback-press`'s Music setting (`useMusicSettings`, 0.14.0+), which its `useMusic` tracks
follow; it's apart from Sound, so a player can keep the effects and turn the music off. Hidden unless
asked for, since most games have no music.

On iOS a line under the Sound, Music and Haptics row says that silent mode mutes Sound and Music
("Silent mode mutes sound and music", or just the one that shows).
`@rific/feedback-press` plays both in the ambient audio session, the convention for game sounds, so
silent mode mutes them; a player who doesn't know that takes the sound for broken, and iOS gives apps
no reliable way to read the switch, so the rows can't grey themselves out. Always shown on iOS while
either row is, never on Android (its silent mode leaves media playing) or the web.

A game's own settings go in two slots. `children` renders between Appearance and Check for Updates
(board options, CPU difficulty, a stats backup). `leading` (0.29.0+) renders first, above every shared
row, for what someone opening Settings from that game is most likely there for (its rules); when it's
given, the shared rows get a GENERAL label under it. Omit `leading` (or pass `null`) and the sheet is
exactly as before. The shared rows that read their own state take explicit opt-outs instead:
`hideSound`, `hideHaptics`, `hideAppearance` and `hideUpdateCheck` (all default `false`).

## Overlay cards (`OverlayCard`, `OverlayBackdrop`, `useOverlayCardColors`)

`ConfirmDialog` and `HowToPlayDialog` draw their card and the dim behind it with these, and a game's
own overlay (a result banner, a game-over card) should too, so every card in the fleet looks the same:

```tsx
import { DialogHeader, OverlayBackdrop, OverlayCard, overlayActionStyles, SecondaryButton, useCompactDialog, useOverlayCardColors } from '@tastic/hud'

function GameOverCard({ onRestart, onQuit }: { onRestart: () => void; onQuit: () => void }) {
  const { fgMuted } = useOverlayCardColors()
  const { compact, onLayout } = useCompactDialog()
  return (
    <OverlayBackdrop onLayout={onLayout}>
      <OverlayCard accessibilityViewIsModal>
        <DialogHeader icon='flag-checkered' title='Game Over' compact={compact} />
        <Text style={{ color: fgMuted }}>Score 42</Text>
        <View style={overlayActionStyles.actions}>
          <SecondaryButton onPress={onQuit}>Quit</SecondaryButton>
          <Button mode='contained' onPress={onRestart} style={overlayActionStyles.actionButton}>Play Again</Button>
        </View>
      </OverlayCard>
    </OverlayBackdrop>
  )
}
```

- **Colors come from the app's theme.** Text is `onSurface` (`fg`) and `onSurfaceVariant` (`fgMuted`),
  and the dim is the theme's `backdrop`, the same scrim auto-paper's own `Dialog` uses. The card is the
  Settings sheet's surface: auto-paper's `BlurView` with no elevation (the theme's plain surface, no
  wash of the primary), no border, and the `Dialog`'s corner radius. So every card and the Settings
  sheet look like one family, in each game's palette and light/dark mode.
- **Every dialog opens with `DialogHeader`.** A 64pt icon over a large bold title, both in the theme's
  primary (pass `color` for another role, as `ConfirmDialog` does with danger when `destructive`).
  `iconColor` (0.32.0+, on `DialogHeader` and `ConfirmDialog`) colors the icon alone, when it
  shouldn't match the title (a white surrender flag under a red Forfeit title); it defaults to `color`.
  `ConfirmDialog`, the how-to-play guide (titled "How to Play") and `BaseSettingsDialog` all use it;
  an app's own cards should too. With `compact` the icon shrinks to 32pt and sits beside a smaller
  title. `useCompactDialog()` decides it: put its `onLayout` on the `OverlayBackdrop`, and it is
  compact when the space the dialog lays out in is under `COMPACT_DIALOG_HEIGHT` (528pt) tall, so a
  phone held sideways. One-button dialogs end in a single contained
  primary button (`overlayActionStyles.actionButtonSingle`), the Settings sheet's Done included.
- **A game can make every header quiet** with `DialogHeaderStyleProvider`, set once at the app's root
  (above auto-paper's `Provider`, so it reaches the dialogs in its portal host). `tone='quiet'` draws a
  22pt icon beside the title, still in the accent (a destructive dialog's danger, a `ConfirmDialog`'s
  `iconColor`), and the title in the theme's plain text color, in the game's own lettering
  (`titleStyle`, laid over `titleLarge` bold). Color is left only in the small icon and the confirm
  button: for a game where the big colored icon reads as too playful. Settings, every `ConfirmDialog`
  (`UpdateDialog` included) and the how-to-play guide follow it. Without the provider, or with
  `tone='standard'`, nothing changes. `useDialogHeaderStyle()` reads it. The provider is exported from
  the main entry, `./chrome` and `./guide` (so an app using only the guide can make its header quiet too);
  `useDialogHeaderStyle` from the main entry and `./chrome`.

  ```tsx
  import { DialogHeaderStyleProvider } from '@tastic/hud'

  const DIALOG_TITLE = { fontSize: 18, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase' } as const

  <DialogHeaderStyleProvider tone='quiet' titleStyle={DIALOG_TITLE}>
    <ThemeProvider>{/* auto-paper's Provider and the rest of the app */}</ThemeProvider>
  </DialogHeaderStyleProvider>
  ```
- **The secondary action is `SecondaryButton`.** Cancel, Skip, Back, a result card's Quit: outlined,
  labeled in the card's text color (`fg`) instead of Paper's default (the theme's primary), and sized
  as one of the action row's buttons. It takes no theme or seat color, so the contained primary beside
  it is the card's only colored button and a seat's card never shows another seat's color. Every prop
  overrides those defaults; a `style` is laid over the row's button style. `ConfirmDialog` and the
  how-to-play card use it.
- **Blur is automatic.** The card blurs what's behind it when the player's Blur setting is on and the
  app hands `expo-blur` to auto-paper's `Provider` (`expoBlur={ExpoBlur}`). Otherwise it paints that
  raised surface color instead: on Android (`BlurView` needs a blur target there, which a card has
  none of), in an app without `expo-blur`, or with Blur off. Beyond passing `expoBlur`, a game wires
  nothing for this.
- **The Blur setting lives in `BaseSettingsDialog`.** Its APPEARANCE section shows a Blur row under the
  appearance picker that flips auto-paper's own `blur` theme setting, which the settings sheet, Paper
  menus and these cards all follow. The row only shows where blur can actually happen: not on
  Android, not in an app that never passed `expoBlur`, and not with `hideAppearance`.
- **`getOverlayCardColors` is gone.** It returned the old fixed black/white card (`#F2F2F2`/`#111111`),
  which ignored the theme and never blurred. Use `useOverlayCardColors` for a card's text and edges.

## Zone-aware popovers (`useZoneClampedAlign`)

`useAutoAlign` - and everything built on it, including `SectionedDropdown`, `InlineColorPicker`, and
`LabeledDropdown` - only knows about the full device window edge. It has no concept of a
`@tastic/split-screen` zone boundary: the shared neutral band between two players' halves, or the
line where one player's zone stops and the other's begins. A popover host that lives entirely
inside one player's zone (rather than centered app-wide, the way `BaseSettingsDialog` is) can end up
choosing an alignment that opens toward the shared band, or overflows past the zone boundary into
the other player's half - not because `useAutoAlign` measured wrong, but because the window edge it
correctly measured against isn't the boundary that actually matters there.

LightCycles hit this for real - its `PlayerSetupPanel`-hosted color/CPU-difficulty pickers live
inside a rotated split-screen zone - and originally built its own local fix for it rather than
waiting for this package to grow zone-awareness. That fix is now `useZoneClampedAlign`, a
first-class export of this package: it wraps `useAutoAlign`'s result and re-derives the vertical
decision (and `maxHeight`) against the zone's real edge, via `@tastic/split-screen`'s
`useZoneBounds()`, instead of the window edge - including correcting for a 180°-rotated zone
inverting `PopoverBody`'s local 'above'/'below' labels relative to their real-world direction.
`@tastic/split-screen` is a peer dependency of this package because of this hook specifically - it's
only ever imported if you actually call `useZoneClampedAlign`.

Same signature and return shape as `useAutoAlign` (`open`, `contentWidth`, `contentHeight` in;
`align`, `verticalAlign`, `maxHeight`, `measured`, `triggerRef` out - exported as `AlignResult`, see
below) so it's a drop-in replacement anywhere `useAutoAlign` is called directly. Outside a
`@tastic/split-screen` zone (`useZoneBounds()` returns `null`), it's a pure passthrough to
`useAutoAlign`'s own decision - safe to reach for even in a component that might or might not end up
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

`ControlSchemePicker` forwards `alignOverride` straight through to the
`SectionedDropdown` it renders internally, so the same call works there too. `PlayerSetupPanel`
places its seat button's dropdown (the profile or CPU-difficulty picker) itself, with
`useZoneClampedAlign` (or the host's own `useSeatPickerAlign`, see above), so there is nothing to
wire for it. Its fallback color swatch, drawn only on a seat with neither picker, isn't a `ReactNode`
slot your own code renders (see "The secondPicker slot" below), so the panel takes
`colorAlignOverride` for it, forwarded straight to that `InlineColorPicker`'s `alignOverride`.
Computing `open` for it needs the swatch's popover id, which
`PlayerSetupPanel` derives from `idPrefix`: call `getColorPopoverId(idPrefix)` (exported, beside
`getProfilePopoverId` and `getCpuDifficultyPopoverId` for the seat button's dropdown) rather than
guessing or hardcoding the naming convention yourself:

```tsx
const { width: windowWidth } = useWindowDimensions()
const colorOpen = host.openId === getColorPopoverId('p2')
const colorSize = getInlineColorPickerContentSize(swatches.length, windowWidth)
const colorAlign = useZoneClampedAlign(colorOpen, colorSize.width, colorSize.height)

<PlayerSetupPanel idPrefix='p2' host={host} color={color} onColorChange={setColor} swatches={swatches} colorAlignOverride={colorAlign} /* ...the rest of your usual props */ />
```

(`cpuDifficultyAlignOverride` was removed in 0.21.0, when the seat button started placing its own
dropdown.)

For any other popover-hosting component that might sit inside a split-screen zone, call
`useZoneClampedAlign` directly in place of `useAutoAlign`.

## The secondPicker slot (read this before wiring one up)

`PlayerSetupPanel`'s `secondPicker` is a caller-rendered `ReactNode` slot next to the built-in color
picker, not a fixed prop shape - the five apps this component was extracted from each wanted a
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
later sibling (the `ReadyButton` beneath it, or another panel next to it - see `pickerRowOpen` in
the component's own source). Without `secondPickerId`, the panel has no way to know your picker's
popover is open, so that elevation never kicks in, and your popover can silently render underneath
sibling content instead of on top of it. If your `secondPicker` never opens a popover of its own (a
plain toggle, static content, or nothing at all), omit `secondPickerId` - there's nothing for it to
track. And if that slotted picker's own popover lives inside a split-screen zone, see "Zone-aware
popovers" above for how to wire `alignOverride` into whatever you construct there.

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
`<ConfirmDialog>` itself - title/message/icon/labels stay authored at each call site (a
score pairing in most apps, a round-history pip row in LightCycles), matching this package's
established "hooks return data, JSX stays at the call site" convention (`usePopoverHost`,
`useAutoAlign`, `useZoneClampedAlign` all do the same).

**`hasProgress` is a lazy `() => boolean` getter, not a plain `boolean` - this is a load-bearing
correction, not a style choice.** A plain-boolean argument forces the caller to compute it every
render from state that, in several apps, doesn't exist yet at that point in the render.
AirHockey/BoxHockey/Pong all fold this hook's own `confirmVisible` into a
`paused = settingsOpen || confirmVisible` that gates `useGameState(paused)` - and
`useGameState`'s *return value* (scores, lives, bricks) is exactly what `hasProgress` needs to
read. A plain boolean here would create a real circular render dependency:
`confirmVisible → paused → useGameState(paused) → {scores/lives/bricks} → hasProgress →
confirmVisible`. The lazy getter breaks the cycle: `hasProgress` is only invoked inside
`requestBack`, at tap time, well after `useGameState` has already produced that render's state -
the getter's closure just reads whatever `scores` is bound to *by then*, the same way a hand-rolled
`onBackPress` closure always did before this hook existed:

```tsx
// AirHockey's game.tsx - hasProgress reads `scores`, a value useGameState (below) hasn't produced
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
  message={`${scores[0]} - ${scores[1]}`}
  confirmLabel='Quit'
  cancelLabel='Cancel'
  onConfirm={safeBack}
  onCancel={cancelBack}
/>
```

A game with no such circular dependency (Snake reads `humanScore`/`opponentScore`, LightCycles
reads `roundHistory.length`) still passes a getter - `() => humanScore > 0 || (opponentScore ?? 0) > 0`;
it's just a plain wrapper around an expression that could have been a bare boolean there; the
signature stays uniform across every call site rather than special-casing the apps that don't
currently need the deferred read.

## Achievements catalog (`AchievementCatalogSection`, `ActivityStatSection`)

Two presentational components for an achievements/stats screen, designed to pair with
[`@tastic/achievements`](https://github.com/jayrdeaton/react-native-game-achievements)'s own
`getAchievementCatalogRows` - the row-computation logic (reading `ACHIEVEMENT_CATALOG`,
`unlockedAchievements`, and stats) lives in that headless package (no react-native/Paper deps of
its own); the two components that actually render the result live here. Mirrors this package's
existing `AchievementRow` (hud, presentational, fully-precomputed props) / achievement-engine-shaped
(pure data) boundary.

**`AchievementCatalogSection`** - an "ALL ACHIEVEMENTS" heading plus one `<AchievementRow>` per
row. Returns a `Fragment`, not a `View`: every call site renders the heading and rows as flat
siblings inside `BaseStatsScreen`'s own gap-spaced `ScrollView` content, and a wrapping container
here would double up that spacing. Resolves each row's locked-vs-unlocked `badgeColor` itself
(`row.tierColor` once `row.unlockedAt` is set, else the locked color) rather than upstream, since
`getAchievementCatalogRows` deliberately leaves that choice to whatever renders the rows. In light
mode the check mark and progress bar are the tier color mixed half with black, since raw gold and
silver barely show on a white screen; the badge keeps the true tier color.

```ts
interface AchievementCatalogSectionProps {
  rows: AchievementCatalogRow[] // from @tastic/achievements' getAchievementCatalogRows
  label?: string // default 'ALL ACHIEVEMENTS'
  fg?: string
  fgMuted?: string
  sectionBg?: string // passed to every row
}
```

**`ActivityStatSection`** - the "ACTIVITY" `<StatSection>` (Days Played / Day Streak / Best Day
Streak). Takes a plain structural `ActivityStats` shape rather than importing
`@tastic/achievements`' own `DayStreakState` type, even though the fields match exactly - this
component has zero dependency, not even type-only, on `@tastic/achievements`; any caller's own
stats object with these three fields satisfies it:

```ts
interface ActivityStatSectionProps {
  stats: { distinctDaysPlayed: number; currentDayStreak: number; bestDayStreak: number }
  fg?: string
  fgMuted?: string
  sectionBg?: string
}
```

**Wells.** Every `StatSection` and `AchievementRow` is a well: the theme's `surface` (the same surface as the dialogs)
on MD3's level-1 shadow, with `onSurface`/`onSurfaceVariant` text. `useWellColors()` returns those colors and
`WELL_SHADOW` the shadow, for an app's own cards (a menu tile) to match. Each component's `fg`/`fgMuted`/`sectionBg`
props still override them.

**Frosted wells (0.32.0+).** While the player's Blur setting is on, `StatSection` and `AchievementRow` are frosted glass
over whatever is behind the screen, so a stats screen over a game's backdrop follows Blur the way the dialogs do. The rule
is `useFrostedWells()`: true while Blur is on, in an app that handed `expo-blur` to auto-paper's `Provider`, and not on
Android (the same rule as `BaseSettingsDialog`'s Blur row). Otherwise a well is the theme's surface, as before. A
`sectionBg` is always solid. `WellBackground` is that layer, for an app's own wells (a game's battle cards): render it
first inside a well that has no `backgroundColor` of its own, and the well keeps its own padding, shadow and layout. It
fills the well, takes no touches, and is clipped to `radius` (default 12, the radius `StatSection` and `AchievementRow`
use); a `color` paints that solid color instead and never frosts. Both are exported from the main entry and `./chrome`.

```tsx
import { WELL_SHADOW, WellBackground } from '@tastic/hud/chrome'

<View style={{ borderRadius: 16, boxShadow: WELL_SHADOW, padding: 12 }}>
  <WellBackground radius={16} />
  <BattleCardContent />
</View>
```

**Captions.** `StatSection` takes an optional `caption`, a short key at the right end of its heading line over the rows'
values, in the well's muted text: `<StatSection label='BY MODE' caption='W-L-D'>` over rows reading "3-2-0".

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
`AchievementTier`) - never a value/runtime import. See Peer Dependencies below.

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
`react-native-reanimated`, `@rific/auto-paper` and `@rific/feedback-press` - none of Skia,
`@tastic/core`, `@tastic/profile`, `@tastic/split-screen`, `@tastic/achievements` or `@rific/updater`
(all marked optional in `peerDependenciesMeta`), so an app that has none of them can use it. A test
(`src/__tests__/guideImports.test.ts`) fails if any file under `src/guide/` ever imports one.

```tsx
import { createGuideSlice, GuideProvider, SeatDiagram, SwipeHint, useAutoShowGuide, useGuide } from '@tastic/hud/guide'

// 1. A persisted "seen" version - its own slice, mounted under `guide` in your root reducer.
const guide = createGuideSlice({ currentVersion: 1 }) // { actions.markSeen, reducer, selectVersionSeen }

// 2. Once, near the root, wrapping your screens (inside PersistGate + your theme/Paper providers).
<GuideProvider
  steps={[{ title: 'Steer Your Cycle', body: 'Swipe up, down, left or right.', art: <SwipeHint direction='up' /> }]}
  currentVersion={1}
  seenVersion={useSelector(guide.selectVersionSeen)}
  onSeen={(v) => dispatch(guide.actions.markSeen(v))}
>
  <Screens />
</GuideProvider>

// 3. On the Home screen, and nowhere else: opens it once per session for a player who hasn't seen it.
useAutoShowGuide()

// 4. Replay from Settings - BaseSettingsDialog renders a "How to Play" row when this is passed.
const { open } = useGuide()
<BaseSettingsDialog {...props} onShowHowToPlay={open} />
```

- **Existing players are grandfathered.** On a fresh install redux-persist's `REHYDRATE` has no payload;
  an existing player has a payload that simply predates the `guide` key. `createGuideSlice` stamps the
  second with `currentVersion` instead of `0`, so an OTA update never greets them with a tutorial (they
  can still replay it). Only finishing or skipping writes; a replay never does. Bump `currentVersion`
  only for a real controls/rules change - everyone sees it again.
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
- **Home only.** Call `useAutoShowGuide()` from the Home screen - that placement is what keeps it from
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
- **The card itself is `HowToPlayDialog`**, which `GuideProvider` renders for you. Render it yourself only
  to show cards outside the provider: `visible`, `steps`, `onFinish` (the last card's button), `onSkip`
  (Skip and Android's back button; a caller persisting "seen" treats it like `onFinish`), and the
  header's `title` and `icon` (default `'How to Play'` and `'help-circle-outline'`).
  `getGuideCardSize(windowWidth, windowHeight)` is the sizing it uses, exported for tests: it returns
  `{ width, pageWidth, maxHeight, artHeight, compact }`. The card is up to 360pt wide inside a 24pt
  gutter, with 132pt of art (88pt when `compact`).

## Fleet chrome without the heavy peers (`@tastic/hud/chrome`)

The shared dialogs, stats screen pieces, corner buttons, popover primitives, color picker and style tokens,
from a standalone entry that never touches the main barrel. It's for an app that has `@tastic/core` and
`@rific/updater` but none of Skia, `@tastic/profile` or `@tastic/split-screen` (Hangman). It exports, with
their props types:

- Dialogs: `BaseSettingsDialog`, `ConfirmDialog`, `UpdateDialog`, `ScreenFrame`
- Stats: `BaseStatsScreen`, `StatSection`, `StatRow`, `AchievementRow`, `LOCKED_BADGE_COLOR`,
  `AchievementCatalogSection`, `ActivityStatSection`, `useWellColors`, `WELL_SHADOW`, `WellBackground`,
  `useFrostedWells` (0.32.0+)
- Chrome: `CornerActionButtons`, `ContentGutter`, `StaggeredWord`, `getStaggeredWordDuration`
- Overlay cards: `OverlayCard`, `OverlayBackdrop`, `useOverlayCardColors`, `SecondaryButton`, `DialogHeader`, `DialogHeaderStyleProvider`, `useDialogHeaderStyle`, `useCompactDialog`, `isCompactDialogHeight`, `COMPACT_DIALOG_HEIGHT`
- Popovers (0.23.0+): `PopoverBody`, `PressAwayOverlay`, `usePopoverHost` (and its `PopoverHost` type),
  `useAutoAlign` (and its `AlignResult`, `PopoverAlign` and `PopoverVerticalAlign` types), `InlineColorPicker`, `getInlineColorPickerContentSize`
- Style tokens: `overlayStyles`, `overlayActionStyles`, `MONO_FONT`

The popovers are here for `@tastic/profile`: from 0.16 its `ProfilePicker`, `ProfilesScreen` and the rest
import them (and `ConfirmDialog`) from this entry instead of the main barrel, so a Skia-free app can use
them. That's why `@tastic/profile` 0.16 needs hud 0.23.0 or later. `useZoneClampedAlign` (it needs `@tastic/split-screen`) and
`PlayerSetupPanel` (it renders `@tastic/profile`'s pickers) are in `@tastic/hud/lobby` (below), and
`SectionedDropdown` (its trigger gauge loads Skia) stays main-entry only.

Each is the same component the main entry exports and is documented above. Only the import path changes:

```tsx
import { BaseSettingsDialog, ConfirmDialog, CornerActionButtons } from '@tastic/hud/chrome'
```

It pulls in only `react`, `react-native`, `react-native-paper`, `react-native-reanimated`,
`react-native-safe-area-context`, `@rific/auto-paper`, `@rific/core`, `@rific/feedback-press`,
`@rific/updater` and `@tastic/core`. `AchievementCatalogSection` uses `@tastic/achievements` for types only, so nothing loads it at
runtime, but an app whose TypeScript resolves the `react-native` export condition (the fleet's tsconfig does)
type-checks hud's source and needs it installed. `AchievementUnlockList` isn't here because it renders
`@tastic/profile`'s `ProfileChip`. A test (`src/__tests__/chromeImports.test.ts`) walks the import graph from
`src/chrome/index.ts` and fails if anything it reaches imports another package, value-imports
`@tastic/achievements`, reaches the main barrel, or has a `.web` twin.

Metro resolves both entries to the same source files, so an app that imports some components from here and
others from `@tastic/hud` still bundles each module once.

## A loadout without Skia (`@tastic/hud/lobby`)

The pieces a two-seat loadout or lobby screen is built from, from a standalone entry that never touches the
main barrel (whose `TriggerGaugeHost` and `loadSkiaWeb` reach Skia). It's for an app that has `@tastic/profile`
and `@tastic/split-screen` but no Skia: `@tastic/shell` loads its loadout through here, so a pack with no Skia
(CardTastic) can install the shell. It exports, with their props types:

- `PlayerSetupPanel` (and `getColorPopoverId`, `getProfilePopoverId`, `getCpuDifficultyPopoverId`)
- `ReadyButton`, `SharedActionBand`, `useZoneClampedAlign`
- the `MenuOption` type (the shape a CPU's difficulty menu is built from)

```tsx
import { PlayerSetupPanel, ReadyButton, SharedActionBand } from '@tastic/hud/lobby'
import { PressAwayOverlay, usePopoverHost } from '@tastic/hud/chrome'
```

It pulls in `react`, `react-native`, `react-native-paper`, `react-native-reanimated`,
`react-native-safe-area-context`, `@rific/auto-paper`, `@rific/feedback-press`, `@tastic/core`,
`@tastic/profile` and `@tastic/split-screen`, none of which loads Skia.
`SectionedDropdown` and `ControlSchemePicker` stay main-entry only: their trigger gauge loads Skia. A test
(`src/__tests__/lobbyImports.test.ts`) walks the import graph from `src/lobby/index.ts` and fails if anything
it reaches imports another package, reaches the main barrel or a Skia module, or has a `.web` twin, and if the
installed `@tastic/profile` or `@tastic/split-screen` imports Skia or the bare `@tastic/hud`. Each piece is
the same one the main entry exports, so Metro bundles it once whichever entry an app imports it from.

## Skia on web (`@tastic/hud/skia`)

On web, Skia draws through CanvasKit, a WASM file fetched at runtime. `@shopify/react-native-skia` builds
its `Skia` object from CanvasKit when the module is first evaluated, so a component that imports Skia can't
even be imported until CanvasKit has loaded. On native there is nothing to wait for.

Every app in the fleet loads Skia the same way, with a host pair: two small files per Skia component, side
by side, that Metro picks between by platform.

```tsx
// BoardHost.tsx: native renders the board directly, on the first frame
import { Board, type BoardProps } from './Board'

export default function BoardHost(props: BoardProps) {
  return <Board {...props} />
}
```

```tsx
// BoardHost.web.tsx: web imports the board only once CanvasKit has loaded
import { lazySkia } from '@tastic/hud/skia'

import type { BoardProps } from './Board'

export default lazySkia<BoardProps>(() => import('./Board').then((m) => ({ default: m.Board })))
```

`lazySkia<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P>` returns a
component that renders a `React.lazy` over `loadSkiaWeb().then(load)` inside a `Suspense` with a `null`
fallback: nothing is drawn, and the board's module isn't even imported, until CanvasKit has loaded. Its
props pass straight through to the board. Written out by hand, it is:

```tsx
const LazyBoard = lazy(() => loadSkiaWeb().then(() => import('./Board').then((m) => ({ default: m.Board }))))

export default function BoardHost(props: BoardProps) {
  return (
    <Suspense fallback={null}>
      <LazyBoard {...props} />
    </Suspense>
  )
}
```

- Import the host, never `Board` itself, everywhere else in the app.
- Call `lazySkia` at module scope, as above, so the component is created once. Called during a render, it
  would be a new component every time, remounting the board.
- Import from `@tastic/hud/skia`. It carries none of the main entry's heavier peers (only `react`), so it
  works in every app. `loadSkiaWeb` and `locateSkiaWebFile` are also exported from `@tastic/hud`;
  `lazySkia` is only on `@tastic/hud/skia`.
- PuckTastic and DuelTastic each had an identical copy of `lazySkia` (`src/shared/lazySkia.tsx`); they
  switch to this one when they take the release that has it.
- A test that imports a native host imports Skia, which throws under Jest (no native bindings). Mock the
  host, or don't import the screen that uses it.

`loadSkiaWeb()` fetches the app's `public/canvaskit.wasm` from `<baseUrl>/canvaskit.wasm`: under the Expo base
URL (`experiments.baseUrl`, e.g. `/snake/canvaskit.wasm`) when the app has one, and `/canvaskit.wasm` when it
doesn't. There's nothing to wire up: babel-preset-expo inlines `process.env.EXPO_BASE_URL` into hud's source
when Metro bundles it, the same as in the app's own code. It's idempotent, so every host can call it.

That rule is `locateSkiaWebFile(file: string): string`, also exported from `@tastic/hud/skia`, for code that
calls Skia's own `LoadSkiaWeb` or `WithSkiaWeb` (`opts={{ locateFile: locateSkiaWebFile }}`). Without it,
canvaskit looks for the file next to the running script or the page, which under a base URL is the wrong
place: from `/snake` (no trailing slash) it asks for `/canvaskit.wasm`, and a static-output app can end up
asking under `/_expo/static/js/web/`. `LoadSkiaWeb` also keeps its first call's result, a failed load
included, for the rest of the page's life.

`TriggerGaugeHost` uses the web half on both platforms: the main entry can't import Skia up front, since every
app that imports `@tastic/hud` would then load Skia, including in its tests.

## Install

Published to the public npm registry as `@tastic/hud`.

```bash
npm install @tastic/hud
```

## ContentGutter

Caps a play area at `maxContentWidth` and splits the leftover width into two equal gutters
(`leftGutter`/`rightGutter` decorations). The width it clamps against is the window's own
(`useWindowDimensions()`): the OS turns the screen, so a landscape window already reports its landscape
width. The clamp is `@tastic/core`'s `computeContentBounds`.

## Peer dependencies

None of these are bundled, so use whatever versions your app already has. Six are marked `optional` in
`peerDependenciesMeta` so a light app can install hud without the ones it doesn't use: `./guide` needs
none of the six, `./chrome` needs only `@tastic/core` and `@rific/updater` (plus
`@tastic/achievements` to type-check, see above), and `./lobby` needs `@tastic/core`, `@tastic/profile` and
`@tastic/split-screen` but never Skia. **npm does not install optional peers for you**, so an app that imports the
main `@tastic/hud` entry must list every peer that entry loads in its own `dependencies`, including
the four optional ones marked "main entry" below. Without them, Metro fails to bundle with "Unable to
resolve module".

| Peer | Floor | Needed by |
| --- | --- | --- |
| `react`, `react-native` | >=19.0.0, >=0.76.0 | every entry |
| `react-native-paper` | >=5.0.0 | main entry, `./guide`, `./chrome`, `./lobby` |
| `react-native-reanimated` | >=3.0.0 | main entry (`StaggeredWord`), `./guide`, `./chrome` (`StaggeredWord`) |
| `@rific/auto-paper` | >=0.13.0 | main entry (`BaseSettingsDialog`'s rows scroll in `FadingScrollView`, first shipped in 0.13.0; it also needs the nested `Portal.Host` first shipped in 0.12.2; `OverlayCard` uses `BlurView` and `useBlur`, and `BaseSettingsDialog`'s Blur row uses `useBlurModule` and `useThemeSettings`, all in 0.12.2), `./guide`, `./chrome`, `./lobby` |
| `@rific/feedback-press` | >=0.14.0 | main entry (`BaseSettingsDialog`'s Music row uses `useMusicSettings`, first shipped in 0.14.0), `./guide`, `./chrome`, `./lobby` |
| `@rific/core` | >=0.4.0 | main entry and `./chrome`: `BaseSettingsDialog`'s Keep Awake row (`useKeepAwakeSettings`, `useExpoKeepAwake`, first shipped in 0.4.0) |
| `react-native-safe-area-context` | >=5.0.0 | main entry and `./lobby` (`useZoneClampedAlign`), `./chrome` (`BaseSettingsDialog`) |
| `@tastic/core` | >=0.15.0, optional | main entry: `BaseSettingsDialog` and `ControlSchemePicker` (`useIsTouchPrimaryDevice`), `InlineColorPicker` and `TriggerGauge` (`clamp`), `ContentGutter` (`computeContentBounds`); `./chrome` (`BaseSettingsDialog`, `InlineColorPicker`, `ContentGutter`); `./lobby` (`PlayerSetupPanel`'s color picker). 0.15 is where the OS turns the screen and core stops drawing a turn: this package follows no turn of its own, so on core 0.14 its dialogs and popovers would stay upright on a turned screen |
| `@rific/updater` | >=0.4.0, optional | main entry and `./chrome`: `BaseSettingsDialog`, `UpdateDialog` |
| `@tastic/profile` | >=0.15.0, optional | main entry: `PlayerSetupPanel` (its seat button is `ProfilePicker` or `OptionPicker`, first shipped in 0.15.0), `AchievementUnlockList` (`ProfileChip`); `./lobby` (`PlayerSetupPanel`) |
| `@tastic/split-screen` | >=0.5.0, optional | main entry and `./lobby`: `useZoneClampedAlign` |
| `@shopify/react-native-skia` | >=2.6.0, optional | `TriggerGaugeHost`'s gauge (loaded when one mounts) and `./skia` |
| `@tastic/achievements` | >=0.2.0, optional | `AchievementCatalogSection`, `AchievementUnlockList`, type-only (`AchievementCatalogRow`, first exported in 0.2.0; `AchievementTier`); `./chrome` needs it installed only to type-check |

---

Made by [Infinite Token](https://www.infinitetoken.com), the team behind [Lumber](https://lumber.infinitetoken.com): end-to-end encrypted logging.
