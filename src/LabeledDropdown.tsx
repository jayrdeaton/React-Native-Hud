import { getContrastColor } from '@rific/auto-paper'
import { TouchableRipple } from '@rific/feedback-press'
import { RefObject } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { PopoverBody } from './PopoverBody'
import { PopoverAlign, PopoverVerticalAlign, useAutoAlign } from './useAutoAlign'
import { PopoverHost } from './usePopoverHost'

const TRIGGER_HEIGHT = 28
const POPOVER_WIDTH = 180
const ROW_HEIGHT = 36
const LIST_PADDING = 8

// Exported so a caller that needs to independently compute this popover's own placement — to feed
// alignOverride with, say, a @tastic/split-screen-zone-aware hook's result — can match its real
// content dimensions exactly, rather than hardcoding or re-deriving this component's own internal
// sizing (which alignOverride itself deliberately doesn't take a dependency on any particular
// zone-awareness package to compute).
export const LABELED_DROPDOWN_POPOVER_WIDTH = POPOVER_WIDTH
export function getLabeledDropdownContentHeight(optionCount: number): number {
  return LIST_PADDING * 2 + optionCount * ROW_HEIGHT
}

export interface LabeledDropdownOption<T extends string> {
  value: T
  label: string
  icon?: string
}

// Same shape useAutoAlign itself returns — lets a caller inside a @tastic/split-screen zone (or
// any other layout this package doesn't know about) substitute its own alignment decision via
// `alignOverride` below, without this package taking a dependency on that caller's own hook.
interface AlignResult {
  align: PopoverAlign
  verticalAlign: PopoverVerticalAlign
  maxHeight: number
  measured: boolean
  triggerRef: RefObject<View | null>
}

interface Props<T extends string> {
  id: string
  host: PopoverHost
  options: LabeledDropdownOption<T>[]
  value: T
  onChange: (value: T) => void
  color: string
  dark: boolean
  // Forces a specific horizontal alignment instead of letting whichever placement result applies
  // (see alignOverride below) decide. Matches PopoverBody's own align prop meaning.
  align?: 'left' | 'right' | 'center'
  // Substitutes this package's own plain useAutoAlign-based placement wholesale (align,
  // verticalAlign, maxHeight, measured, triggerRef) with a caller-supplied one — e.g. a popover
  // living inside a @tastic/split-screen zone, where the plain window-relative decision can pick a
  // direction that overflows into the shared row instead of the actual zone boundary. Omit for the
  // ordinary case (a popover with nothing but the screen edge to avoid).
  alignOverride?: AlignResult
}

// A name-trigger + selection popover in the same visual style as @tastic/profile's own
// ProfilePicker trigger — an uppercase text label + chevron, opening a list whose selected row
// fills entirely with the seat's own accent color — rather than this package's own
// SectionedDropdown, whose trigger is a fixed icon with a gauge ring around it. For a choice that
// reads more like "who/what you're playing" than "a game setting" (a CPU seat's own difficulty,
// occupying the same slot a human seat's ProfilePicker would), the always-visible text label
// carries more of the meaning than an icon would on its own.
export function LabeledDropdown<T extends string>({ id, host, options, value, onChange, color, dark, align: forcedAlign, alignOverride }: Props<T>) {
  const menuBg = dark ? '#000000' : '#FFFFFF'
  const fg = dark ? '#FFFFFF' : '#000000'

  const open = host.openId === id
  const selected = options.find((o) => o.value === value) ?? null
  const contentHeight = LIST_PADDING * 2 + options.length * ROW_HEIGHT
  // Always called, even when alignOverride is supplied and this result goes unused — hooks can't be
  // called conditionally. A caller passing alignOverride (e.g. LightCycles' own useZoneClampedAlign,
  // which already wraps this same hook) does end up measuring the trigger twice; an acceptable
  // tradeoff for keeping this component's own hook usage unconditional and override-shaped rather
  // than needing a second, hook-free code path.
  const auto = useAutoAlign(open, POPOVER_WIDTH, contentHeight)
  const placement = alignOverride ?? auto
  const { maxHeight, measured, triggerRef, verticalAlign } = placement
  const align = forcedAlign ?? placement.align

  const handleSelect = (option: LabeledDropdownOption<T>) => {
    onChange(option.value)
    host.close()
  }

  return (
    <View style={[styles.anchor, open && styles.anchorOpen]}>
      <TouchableRipple onPress={() => host.toggle(id)} style={styles.trigger}>
        <View ref={triggerRef} collapsable={false} style={styles.triggerInner}>
          <Text style={[styles.triggerLabel, { color }]} numberOfLines={1}>
            {(selected?.label ?? '').toUpperCase()}
          </Text>
          <Icon source='menu-down' size={16} color={color} />
        </View>
      </TouchableRipple>

      {/* Gated on `measured`, not just `open` — see InlineColorPicker's identical fix. */}
      <PopoverBody visible={open && measured} align={align} verticalAlign={verticalAlign} caretColor={menuBg} caretBorderColor={color} caretBorderWidth={2} triggerSize={TRIGGER_HEIGHT}>
        <ScrollView style={[styles.menu, { backgroundColor: menuBg, borderColor: color, width: POPOVER_WIDTH, maxHeight }]} contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isSelected = option.value === value
            const onColor = getContrastColor(color)
            return (
              <TouchableRipple key={option.value} onPress={() => handleSelect(option)} style={[styles.row, isSelected && { backgroundColor: color }]}>
                <View style={styles.rowInner}>
                  {option.icon && <Icon source={option.icon} size={18} color={isSelected ? onColor : fg} />}
                  <Text style={[styles.rowLabel, { color: isSelected ? onColor : fg }]} numberOfLines={1}>
                    {option.label}
                  </Text>
                </View>
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
  // React Native Web gives every position:'relative' view its own stacking context, so the
  // elevation has to live on the anchor itself — see PopoverBody's own stacking-context notes.
  anchorOpen: {
    zIndex: 100
  },
  menu: {
    borderRadius: 12,
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  menuContent: {
    padding: LIST_PADDING
  },
  row: {
    borderRadius: 8,
    height: ROW_HEIGHT
  },
  rowInner: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    paddingHorizontal: 12
  },
  rowLabel: {
    flex: 1,
    fontSize: 14
  },
  trigger: {
    alignSelf: 'flex-start'
  },
  triggerInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    height: TRIGGER_HEIGHT
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1
  }
})
