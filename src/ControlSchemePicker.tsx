import { useIsTouchPrimaryDevice } from '@tastic/core'
import { Platform } from 'react-native'

import { MenuOption, SectionedDropdown } from './SectionedDropdown'
import { PopoverHost } from './usePopoverHost'

export interface ControlSchemePickerProps<T extends string | number> {
  id: string
  host: PopoverHost
  value: T
  onChange: (value: T) => void
  options: MenuOption<T>[]
  // Another seat's currently-selected scheme, if any — passed straight through as the underlying
  // section's own takenValue (see SectionedDropdown's own doc: stays in the list, shown disabled,
  // rather than filtered out). Two local seats sharing one physical keyboard (and, depending on your
  // own option set, one mouse) can't both be assigned the same scheme at once; this is what a caller
  // wires up to prevent that.
  takenValue?: T
  accentColor: string
  mutedColor: string
  onAccentColor?: string
  dark: boolean
  align?: 'left' | 'right' | 'center'
  labelFontFamily?: string
}

// A single-select SectionedDropdown, opinionated for exactly one job: letting a local seat pick
// which physical input drives it in a couch-multiplayer game. Fixes the trigger icon and
// accessibility label so every game's control-scheme picker looks and reads the same, and — the
// actual reason this exists as its own component rather than a usage snippet in each app's own
// docs — bakes in the "does this even mean anything right now" gate every consumer was independently
// re-deriving: a physical keyboard scheme has no meaning on a touch-primary device (there's nothing
// to pick a *keyboard* layout for), and this repo's own components target React Native Web, where
// `Platform.OS !== 'web'` means native/touch already, so keying off `useIsTouchPrimaryDevice` alone
// isn't enough on its own — a native touch device still needs the `Platform.OS` check to be excluded
// the same way a desktop browser needs the touch check. Renders nothing at all when either
// condition fails, rather than a disabled/empty picker, so a caller can mount this unconditionally
// inside its own per-seat layout (a `View` row alongside a color picker, say) without its own
// `Platform`/`useIsTouchPrimaryDevice` branch — an always-rendered-but-sometimes-null child is a
// no-op in a flex layout, so the surrounding row collapses to just its other children automatically.
//
// Deliberately generic over `T` (matching SectionedDropdown's own `MenuOption<T>`) rather than
// hardcoding a fixed scheme union: this repo has no opinion on which schemes exist — the raw
// physical-key layouts (wasd/arrows/ijkl/numpad) live in `@tastic/input`, and any extra values with
// no keys of their own (a "keep using pointer input" option, say) are purely a per-app label — so a
// caller always supplies its own `options` (and typically its own `T`) rather than this component
// importing `@tastic/input` and choosing a set for every consumer.
export function ControlSchemePicker<T extends string | number>({ id, host, value, onChange, options, takenValue, accentColor, mutedColor, onAccentColor, dark, align, labelFontFamily }: ControlSchemePickerProps<T>) {
  const isTouchPrimary = useIsTouchPrimaryDevice()
  if (Platform.OS !== 'web' || isTouchPrimary) return null

  return <SectionedDropdown id={id} host={host} icon='keyboard-outline' accessibilityLabel='Control scheme' sections={[{ kind: 'single', id: 'controls', options, value, onChange, takenValue }]} accentColor={accentColor} mutedColor={mutedColor} onAccentColor={onAccentColor} dark={dark} align={align} labelFontFamily={labelFontFamily} />
}
