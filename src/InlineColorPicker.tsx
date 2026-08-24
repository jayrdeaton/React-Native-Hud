import { defaultColors, getContrastColor, SeedColor } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Icon } from 'react-native-paper'

import { PopoverBody } from './PopoverBody'
import { useAutoAlign } from './useAutoAlign'
import { PopoverHost } from './usePopoverHost'

const SIZE = 48
const SWATCH_SIZE = 28
const SWATCHES_PADDING = 8
const SWATCHES_GAP = 6
const SWATCHES_BORDER_WIDTH = 2
// However wide the actual screen is, the grid never goes narrower than 3 columns or wider than 6 —
// below 3 it reads as a cramped single-file list, above 6 the swatches themselves get lost in a
// wall of tiny color chips instead of reading as a deliberate palette.
const MIN_COLUMNS = 3
const MAX_COLUMNS = 6
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
  // human, a robot for CPU) to convey identity through the icon itself.
  icon?: string
  // Whether picking a swatch closes the popover. Defaults to true — a color pick is a single,
  // complete choice the same way a single-select dropdown row is (see SectionedDropdown's identical
  // prop), so press-away isn't the only way out, but doesn't have to be either.
  autoDismiss?: boolean
  // Overrides the auto-computed column count (see MIN_COLUMNS/MAX_COLUMNS/SCREEN_MARGIN above).
  columns?: number
}

// Renders inline rather than as a full-screen modal, scoped to its own panel — a modal color
// picker would block the whole screen for one player while another can't touch their own panel at
// the same time, which defeats the point of a split-screen lobby.
export function InlineColorPicker({ id, host, value, onChange, swatches = defaultColors, takenValue, allowSwapTaken, dark, align: alignOverride, icon = 'palette', autoDismiss = true, columns }: Props) {
  const menuBg = dark ? '#000000' : '#FFFFFF'
  const { width: windowWidth } = useWindowDimensions()
  const autoColumns = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.floor((windowWidth - 2 * SCREEN_MARGIN + SWATCHES_GAP) / (SWATCH_SIZE + SWATCHES_GAP))))
  const resolvedColumns = columns ?? autoColumns
  const swatchesWidth = widthForColumns(resolvedColumns)
  const swatchRows = Math.ceil(swatches.length / resolvedColumns)
  const swatchesHeight = SWATCHES_BORDER_WIDTH * 2 + SWATCHES_PADDING * 2 + SWATCH_SIZE * swatchRows + SWATCHES_GAP * (swatchRows - 1)

  const open = host.openId === id
  const { align: autoAlign, maxHeight, measured, triggerRef, verticalAlign } = useAutoAlign(open, swatchesWidth, swatchesHeight)
  const align = alignOverride ?? autoAlign

  return (
    <View style={[styles.anchor, open && styles.anchorOpen]}>
      <TouchableRipple onPress={() => host.toggle(id)} borderless style={[styles.trigger, { backgroundColor: value }]}>
        <View ref={triggerRef} collapsable={false} style={styles.triggerMeasure}>
          <Icon source={icon} size={20} color={getContrastColor(value)} />
        </View>
      </TouchableRipple>

      {/* Gated on `measured`, not just `open` — see useAutoAlign's own comment and
      SectionedDropdown's identical fix: without it, the popover mounts for one frame at a stale or
      guessed alignment and visibly jumps once this open's own measurement lands. */}
      <PopoverBody visible={open && measured} align={align} verticalAlign={verticalAlign} caretColor={menuBg} caretBorderColor={value} caretBorderWidth={SWATCHES_BORDER_WIDTH} triggerSize={SIZE}>
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
  trigger: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: SIZE / 2,
    height: SIZE,
    justifyContent: 'center',
    width: SIZE
  },
  // Wraps just the icon, inside the TouchableRipple, purely so useAutoAlign has a plain View to
  // attach its measurement ref to — TouchableRipple itself doesn't forward a ref to a measurable
  // native node.
  triggerMeasure: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%'
  }
})
