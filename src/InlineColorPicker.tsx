import { defaultColors, getContrastColor, SeedColor } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { clamp } from '@tastic/core'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { MONO_FONT } from './fonts'
import { PopoverBody } from './PopoverBody'
import { useAutoAlign } from './useAutoAlign'
import { PopoverHost } from './usePopoverHost'

// Presence check, not a full-string "is this exactly one emoji" validation — this only decides a
// font-size ratio for the trigger's own `tag`, so it doesn't need that precision, just "does this
// tag contain a pictograph at all."
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u

const DEFAULT_SIZE = 48
const SWATCH_SIZE = 28
const SWATCHES_PADDING = 8
const SWATCHES_GAP = 6
const SWATCHES_BORDER_WIDTH = 2
// Clamped to exactly 4 or 5, not a wider 3-6 range — `defaultColors` (this component's own default
// `swatches`, and what every consumer actually ends up passing) is exactly 20 colors, so 4 or 5
// columns are the only counts that fill every row completely (4x5 or 5x4) instead of leaving a
// ragged, off-center last row. A caller passing a custom, non-20-length `swatches` list still gets
// a reasonable grid either way — just not guaranteed to be a full rectangle.
const MIN_COLUMNS = 4
const MAX_COLUMNS = 5
// How much screen width the grid leaves alone on either side when computing how many columns fit —
// this trigger can sit anywhere (including flush against a player's own screen edge in split-screen
// mode), so the budget is against the whole window, not this trigger's own local space.
const SCREEN_MARGIN = 40

function widthForColumns(columns: number) {
  return SWATCHES_BORDER_WIDTH * 2 + SWATCHES_PADDING * 2 + SWATCH_SIZE * columns + SWATCHES_GAP * (columns - 1)
}

interface Props {
  id: string
  host: PopoverHost
  value: string
  onChange: (hex: string) => void
  swatches?: SeedColor[]
  // The other player's current color, if any — stays visible in the grid (so the full palette
  // reads consistently for both players) but renders disabled with an X, rather than being
  // silently removed from the list. Unless allowSwapTaken is set — see that prop.
  takenValue?: string
  // Lets a tap on the taken swatch swap the two colors (this picker takes it, the other slot takes
  // this picker's old color) instead of being disabled — useful when the "other" slot is CPU-
  // controlled, not a second real person's choice to step on. Leave unset when the other slot is a
  // human player: swapping their color out from under them without their input isn't the same
  // tradeoff.
  allowSwapTaken?: boolean
  dark: boolean
  // Manual override — omit to let the popover measure its own trigger and pick whichever alignment
  // keeps it from overflowing the screen edge (see useAutoAlign).
  align?: 'left' | 'right' | 'center'
  // Trigger glyph — defaults to a plain palette. Pass a distinct icon per slot (e.g. a face for a
  // human, a robot for CPU) to convey identity through the icon itself. Overridden by `tag` below
  // when present.
  icon?: string
  // A short identity mark (an initial, an emoji, a couple of characters) shown as text on the
  // trigger instead of `icon` — e.g. a saved player profile's own tag. Falls back to `icon` when
  // empty/omitted, same as a seat with no such identity selected.
  tag?: string
  // Same convention as SectionedDropdown/ReadyButton's identical prop — defaults to this package's
  // own MONO_FONT rather than inheriting whatever font the host app's theme happens to be using,
  // so this trigger's tag reads consistently with the rest of this package's own chrome text.
  labelFontFamily?: string
  // Whether picking a swatch closes the popover. Defaults to true — a color pick is a single,
  // complete choice the same way a single-select dropdown row is (see SectionedDropdown's identical
  // prop), so press-away isn't the only way out, but doesn't have to be either.
  autoDismiss?: boolean
  // Overrides the auto-computed column count (see MIN_COLUMNS/MAX_COLUMNS/SCREEN_MARGIN above).
  columns?: number
  // Trigger circle's diameter — defaults to DEFAULT_SIZE. Overridable so a caller sharing a row
  // with other fixed-size elements can line this trigger up with them instead of standing out at a
  // mismatched size.
  size?: number
}

// Renders inline rather than as a full-screen modal, scoped to its own panel — a modal color
// picker would block the whole screen for one player while another can't touch their own panel at
// the same time, which defeats the point of a split-screen lobby.
export function InlineColorPicker({ id, host, value, onChange, swatches = defaultColors, takenValue, allowSwapTaken, dark, align: alignOverride, icon = 'palette', tag, labelFontFamily = MONO_FONT, autoDismiss = true, columns, size = DEFAULT_SIZE }: Props) {
  const menuBg = dark ? '#000000' : '#FFFFFF'
  const { width: windowWidth } = useWindowDimensions()
  const autoColumns = clamp(Math.floor((windowWidth - 2 * SCREEN_MARGIN + SWATCHES_GAP) / (SWATCH_SIZE + SWATCHES_GAP)), MIN_COLUMNS, MAX_COLUMNS)
  const resolvedColumns = columns ?? autoColumns
  const swatchesWidth = widthForColumns(resolvedColumns)
  const swatchRows = Math.ceil(swatches.length / resolvedColumns)
  const swatchesHeight = SWATCHES_BORDER_WIDTH * 2 + SWATCHES_PADDING * 2 + SWATCH_SIZE * swatchRows + SWATCHES_GAP * (swatchRows - 1)

  const open = host.openId === id
  const { align: autoAlign, maxHeight, measured, triggerRef, verticalAlign } = useAutoAlign(open, swatchesWidth, swatchesHeight)
  const align = alignOverride ?? autoAlign
  const contrastColor = getContrastColor(value)
  // An emoji glyph reads visually smaller than a bold letter at the same fontSize (the system emoji
  // font leaves more of its own em-box empty), so a plain-text ratio that looks right for an initial
  // still looks small for an emoji tag at the identical size — this bumps emoji up to the icon's own
  // ratio instead, since a single emoji is closer in visual weight to an icon glyph than to text.
  const tagFontSize = size * (tag && EMOJI_PATTERN.test(tag) ? 0.6 : 0.4)

  return (
    <View style={[styles.anchor, open && styles.anchorOpen]}>
      <TouchableRipple onPress={() => host.toggle(id)} borderless style={[styles.trigger, { backgroundColor: value, borderRadius: size / 2, height: size, width: size }]}>
        <View ref={triggerRef} collapsable={false} style={styles.triggerMeasure}>
          {/* Sized as a fraction of the trigger's own diameter rather than a fixed pixel size, so
          the glyph still reads as a deliberate part of the circle instead of shrinking toward its
          center on a larger trigger. */}
          {tag ? (
            <Text style={[styles.tagLabel, { color: contrastColor, fontFamily: labelFontFamily, fontSize: tagFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
              {tag}
            </Text>
          ) : (
            <Icon source={icon} size={size * 0.6} color={contrastColor} />
          )}
        </View>
      </TouchableRipple>

      {/* Gated on `measured`, not just `open` — see useAutoAlign's own comment and
      SectionedDropdown's identical fix: without it, the popover mounts for one frame at a stale or
      guessed alignment and visibly jumps once this open's own measurement lands. */}
      <PopoverBody visible={open && measured} align={align} verticalAlign={verticalAlign} caretColor={menuBg} caretBorderColor={value} caretBorderWidth={SWATCHES_BORDER_WIDTH} triggerSize={size}>
        {/* Border matches this trigger's own current color (not a neutral gray) — two triggers can
        sit close together, so the popover needs a clear visual tie back to which one opened it,
        not just its screen position. maxHeight (see useAutoAlign) only actually clamps on a screen
        short enough that the full grid can't fit above or below the trigger either way — a short
        landscape screen with the trigger row near the top, same case SectionedDropdown's own
        ScrollView exists for. */}
        <ScrollView style={[styles.swatches, { backgroundColor: menuBg, borderColor: value, width: swatchesWidth, maxHeight }]} contentContainerStyle={styles.swatchesContent} showsVerticalScrollIndicator={false}>
          {swatches.map((swatch) => {
            const selected = swatch.value.toLowerCase() === value.toLowerCase()
            const taken = !selected && !!takenValue && swatch.value.toLowerCase() === takenValue.toLowerCase()
            const swappable = taken && allowSwapTaken
            return (
              <TouchableRipple
                key={swatch.value}
                disabled={taken && !swappable}
                onPress={() => {
                  onChange(swatch.value)
                  if (autoDismiss) host.close()
                }}
                borderless
                style={[styles.swatch, { backgroundColor: swatch.value }, selected && styles.swatchSelected, taken && !swappable && styles.swatchTaken]}
              >
                {selected ? <Icon source='check' size={16} color={getContrastColor(swatch.value)} /> : swappable ? <Icon source='swap-horizontal' size={16} color={getContrastColor(swatch.value)} /> : taken ? <Icon source='close' size={16} color={getContrastColor(swatch.value)} /> : <View />}
              </TouchableRipple>
            )
          })}
        </ScrollView>
      </PopoverBody>
    </View>
  )
}

const styles = StyleSheet.create({
  anchor: {
    position: 'relative'
  },
  // See SectionedDropdown's identical comment — React Native Web gives every position:'relative' view
  // its own stacking context, so the elevation has to live on the anchor itself, not just the
  // popover content nested inside it, to correctly paint above this anchor's own later siblings.
  anchorOpen: {
    zIndex: 100
  },
  swatch: {
    alignItems: 'center',
    borderRadius: SWATCH_SIZE / 2,
    height: SWATCH_SIZE,
    justifyContent: 'center',
    width: SWATCH_SIZE
  },
  swatchSelected: {
    borderColor: '#ffffff',
    borderWidth: 2
  },
  swatchTaken: {
    opacity: 0.35
  },
  swatches: {
    borderRadius: 12,
    borderWidth: SWATCHES_BORDER_WIDTH,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8
    // width is set inline above — border-box sizing means it has to include the border too
    // (2*SWATCHES_BORDER_WIDTH), not just padding+content, or exactly enough room goes missing that
    // the last column silently wraps to a new row. Anything wider than the exact sum just shows as
    // dead space on the right edge of each row instead.
  },
  // Separate from `swatches` itself — see SectionedDropdown's identical menu/menuContent split.
  // The scroll frame's own bounds (including maxHeight) live on the ScrollView; the actual grid
  // wrapping belongs to its contentContainerStyle, which sizes to the unclamped content instead.
  swatchesContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SWATCHES_GAP,
    padding: SWATCHES_PADDING
  },
  // borderRadius/height/width come from the `size` prop instead (see render-site override) — no
  // fixed default here, since this style object is shared by every caller regardless of size.
  trigger: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center'
  },
  // Wraps just the icon/tag, inside the TouchableRipple, purely so useAutoAlign has a plain View
  // to attach its measurement ref to — TouchableRipple itself doesn't forward a ref to a
  // measurable native node. Padded horizontally so a multi-character tag doesn't butt right up
  // against the trigger's own circular edge (an icon alone doesn't need it, but this style is
  // shared by both).
  triggerMeasure: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: '100%'
  },
  tagLabel: {
    fontWeight: '700',
    letterSpacing: 0.5
  }
})
