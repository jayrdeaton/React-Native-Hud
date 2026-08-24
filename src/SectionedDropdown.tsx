import { getBlendedColor, getColorRoles } from '@rific/auto-paper'
import { IconButton, TouchableRipple } from '@rific/feedback-press'
import { ScrollView, StyleSheet, TextStyle, View } from 'react-native'
import { Icon, Text } from 'react-native-paper'

import { MONO_FONT } from './fonts'
import { PopoverBody } from './PopoverBody'
import TriggerGaugeHost from './TriggerGaugeHost'
import { useAutoAlign } from './useAutoAlign'
import { PopoverHost } from './usePopoverHost'

const MENU_BORDER_WIDTH = 1
// Matches triggerBox's own height/width below — passed to PopoverBody so its caret can point at
// this trigger's actual center, not the (usually wider) menu's midpoint.
const TRIGGER_SIZE = 44
const MENU_MIN_WIDTH = 200
// Fed into useAutoAlign as the popover's assumed width — a real render can come in narrower
// (shrink-to-fit content), but never wider, since `menu` below caps at this same value. Alignment
// math staying in sync with the actual rendered cap is what keeps it from ever being wrong in a way
// that lets the popover clip off-screen.
const MENU_MAX_WIDTH = 220
const MENU_ITEM_ICON_SIZE = 18
// Tuned by eye: wide enough that a short one-word-ish label stays on one line, narrow enough that a
// sentence-length description reliably wraps onto a second line instead.
const MENU_ITEM_LABEL_MAX_WIDTH = 150
// Estimated per-row heights fed into useAutoAlign's vertical flip — approximate (item's own
// padding + a labelLarge line, give or take font metrics), not measured, for the same reason
// MENU_MAX_WIDTH is a fixed cap rather than a measured value: knowing it before the popover renders
// is what lets the flip decision happen in the same frame as opening, instead of a measure-then-
// reposition flicker.
const MENU_ITEM_HEIGHT = 40
const MENU_ITEM_HEIGHT_WITH_DESCRIPTION = 58
const MENU_DIVIDER_HEIGHT = 9
const MENU_VERTICAL_PADDING = 12

export interface MenuOption<T extends string | number> {
  value: T
  label: string
  description?: string
  // Optional per-option icon — when every option in a single-select section has one, the trigger
  // shows the currently selected option's icon instead of the static fallback, so the value is
  // readable at a glance without opening the dropdown. Unused by multi-select sections (there's no
  // single "the" selected option to show on the trigger).
  icon?: string
  iconSize?: number
}

// Exactly one of these can be true at a time — radio-style. Tapping a row selects it; whether that
// also closes the popover is controlled by the dropdown's own `autoDismiss` prop.
export interface SingleSelectSection<T extends string | number> {
  kind: 'single'
  id: string
  options: MenuOption<T>[]
  value: T
  onChange: (value: T) => void
}

// Any number of these can be true at once — checkbox-style. Tapping a row toggles just that one and
// never closes the popover on its own (unlike a single-select row, picking one of several things
// isn't "done" the way picking the one value in a single-select is).
export interface MultiSelectSection<T extends string | number> {
  kind: 'multi'
  id: string
  options: MenuOption<T>[]
  value: T[]
  onChange: (value: T[]) => void
  // Renders an alternating All/Clear bulk-toggle button beneath this section's rows — label reflects
  // what tapping it would do next (every option already selected -> "Clear"; anything else -> "All").
  allClear?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MenuSection = SingleSelectSection<any> | MultiSelectSection<any>

interface Props {
  id: string
  host: PopoverHost
  // Static fallback trigger icon — used whenever there isn't a single unambiguous "selected option"
  // to show instead (see the trigger-icon logic below).
  icon: string
  accessibilityLabel: string
  sections: MenuSection[]
  accentColor: string
  mutedColor: string
  // Foreground for a selected row's icon/text, painted on top of accentColor's own fill — accentColor
  // isn't guaranteed to be a fixed brand tone (a consumer may derive it from a user-chosen color), so
  // a hardcoded black or a guessed contrast color both risk landing unreadable against it. Omit to
  // derive one automatically (getColorRoles' onColor) from accentColor against this popover's own
  // background — pass a real design-system "on" color explicitly instead when you have one.
  onAccentColor?: string
  dark: boolean
  // Manual override — omit to let the popover measure its own trigger and pick whichever alignment
  // keeps it from overflowing the screen edge (see useAutoAlign). Only pass this to force a specific
  // side regardless of where the trigger actually sits.
  align?: 'left' | 'right' | 'center'
  // Whether picking a value in a *single-select* section closes the popover. Defaults to true
  // (the old, pre-press-away default: pick one thing, you're done). Multi-select rows never
  // auto-close regardless of this — see MultiSelectSection's own comment. Worth setting false for a
  // dropdown with multiple sections, where picking one value while another's still being decided
  // shouldn't snap the whole thing shut; press-away (or the trigger itself) closes it instead.
  autoDismiss?: boolean
  // Defaults to the system monospace font — pass your own game's registered font to match its UI.
  labelFontFamily?: string
  allClearLabels?: { all: string; clear: string }
}

// Single popover shell that can hold any mix of single-select ("pick one") and multi-select ("pick
// some") sections, divided by rules. A plain single-value picker (grid size, speed, CPU difficulty,
// control scheme, ...) is just this with one 'single' section; a multi-select toggle list (which
// powerups are enabled, say) is just this with one 'multi' section (optionally with allClear); a
// combined menu (e.g. spawn frequency + which types, in one menu) is just two sections in the same
// array.
export function SectionedDropdown({ id, host, icon, accessibilityLabel, sections, accentColor, mutedColor, onAccentColor, dark, align: alignOverride, autoDismiss = true, labelFontFamily = MONO_FONT, allClearLabels = { all: 'All', clear: 'Clear' } }: Props) {
  const menuBg = dark ? '#000000' : '#FFFFFF'
  // mutedColor is translucent (fine for the icon/text tints below, each a single paint), but the
  // caret is deliberately drawn overlapping the box's own top border (PopoverBody's CARET_DIP,
  // needed to avoid a subpixel seam between the two separately-drawn edges) — with a translucent
  // color that overlap double-blends into a visibly lighter patch, unlike every other (opaque-
  // bordered) popover in the app. Flattened once against this menu's own solid background so the
  // box border and caret ring paint identically instead of compounding.
  const menuBorderColor = getBlendedColor(mutedColor, menuBg, 0.5)
  const resolvedOnAccentColor = onAccentColor ?? getColorRoles(accentColor, menuBg).onColor
  // A bold, always-legible foreground — the trigger icon's job is category identity ("this is grid
  // size"), not state, so it stays as bold as any other icon on screen (a back arrow, a settings
  // gear) instead of dimmed. State lives entirely in TriggerGaugeHost's ring around it.
  const fg = dark ? '#FFFFFF' : '#000000'

  const open = host.openId === id
  // Estimated, not measured — see MENU_ITEM_HEIGHT's own comment. Every row, plus a divider between
  // sections, plus a footer row for whichever multi-select sections show one.
  const estimatedHeight =
    MENU_VERTICAL_PADDING +
    sections.reduce((sum, section, sectionIndex) => {
      const rows = section.options.reduce((rowSum, option) => rowSum + (option.description ? MENU_ITEM_HEIGHT_WITH_DESCRIPTION : MENU_ITEM_HEIGHT), 0)
      const footer = section.kind === 'multi' && section.allClear ? MENU_ITEM_HEIGHT : 0
      const divider = sectionIndex > 0 ? MENU_DIVIDER_HEIGHT : 0
      return sum + rows + footer + divider
    }, 0)
  const { align: autoAlign, maxHeight, measured, triggerRef, verticalAlign } = useAutoAlign(open, MENU_MAX_WIDTH, estimatedHeight)
  const align = alignOverride ?? autoAlign

  // Trigger reflects the selected option's own icon only when there's exactly one section and it's
  // single-select — any other shape (multi-select present, or more than one section) has no single
  // unambiguous "the" value to show, so it falls back to the static icon instead.
  const onlySection = sections.length === 1 ? sections[0] : null
  const selectedOption = onlySection?.kind === 'single' ? onlySection.options.find((o) => o.value === onlySection.value) : undefined
  const triggerIcon = selectedOption?.icon ?? icon
  const triggerIconSize = selectedOption?.iconSize ?? 22
  const hasMultiSection = sections.some((s) => s.kind === 'multi')
  const anyMultiSelected = sections.some((s) => s.kind === 'multi' && s.value.length > 0)
  // A single-select trigger always has exactly one active value, so there's no "off" state for its
  // icon to distinguish — plain fg, unconditionally. A multi-select one (powerups, say) genuinely
  // can be fully off (nothing enabled), which is different information than *which* ones are on
  // (the gauge ring's job) — worth a real on/off read on the icon itself, especially once a section
  // like this gains a combined off/few/many dimension alongside its checkboxes.
  const triggerIconColor = hasMultiSection ? (anyMultiSelected ? accentColor : fg) : fg

  // Unlike the trigger-icon override above (which only makes sense for a single unambiguous "the"
  // value), the gauge ring has no such restriction — it just needs a position per option and which
  // ones are lit, so it flattens every section's options into one combined ring instead of only
  // rendering when there's exactly one section. A two-section dropdown (say, board variant + a
  // rink toggle riding along as its own single-item multi-select) reads as one ring where the first
  // N dashes are the single-select's tiers and the last dash is the toggle, each section's own
  // selection state lighting independently within its own slice.
  const gaugeSegments = sections.reduce((sum, section) => sum + section.options.length, 0)
  const gaugeLitIndices: number[] = []
  let gaugeOffset = 0
  for (const section of sections) {
    if (section.kind === 'single') {
      const index = section.options.findIndex((o) => o.value === section.value)
      if (index >= 0) gaugeLitIndices.push(gaugeOffset + index)
    } else {
      section.options.forEach((o, i) => {
        if (section.value.includes(o.value)) gaugeLitIndices.push(gaugeOffset + i)
      })
    }
    gaugeOffset += section.options.length
  }

  const anchorStyle = [styles.anchor, open && styles.anchorOpen]
  const menuStyle = { backgroundColor: menuBg, borderColor: menuBorderColor, maxHeight }
  const dividerStyle = { backgroundColor: menuBorderColor }

  return (
    <View style={anchorStyle}>
      <View ref={triggerRef} collapsable={false} style={styles.triggerBox}>
        <TriggerGaugeHost segments={gaugeSegments} litIndices={gaugeLitIndices} size={TRIGGER_SIZE} accentColor={accentColor} mutedColor={mutedColor} />
        <IconButton icon={triggerIcon} iconColor={triggerIconColor} size={triggerIconSize} accessibilityLabel={accessibilityLabel} onPress={() => host.toggle(id)} />
      </View>

      {/* Gated on `measured`, not just `open` — see useAutoAlign's own comment. Without it, the
      popover mounts for one frame at whatever align/verticalAlign the *previous* open (or the
      initial center/below guess) left behind, then visibly jumps once this open's own measurement
      lands — most noticeable near a screen edge, where the guess is furthest from correct. */}
      <PopoverBody visible={open && measured} align={align} verticalAlign={verticalAlign} caretColor={menuBg} caretBorderColor={menuBorderColor} caretBorderWidth={MENU_BORDER_WIDTH} triggerSize={TRIGGER_SIZE}>
        {/* maxHeight is the room useAutoAlign actually found in whichever direction it picked — on
        a screen tall enough for the estimated content, this never kicks in (estimatedHeight itself
        is always <= maxHeight then, so nothing scrolls); on a short landscape screen where neither
        direction has enough room, this is what keeps the menu from just running off the screen
        edge instead of flipping only made it run off a *smaller* amount. */}
        <ScrollView style={[styles.menu, menuStyle]} contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
          {sections.map((section, sectionIndex) => (
            <View key={section.id}>
              {/* Every section after the first gets a rule above it — the divider belongs to the
              boundary between sections, not to either section itself, so it's keyed off position
              rather than each section carrying its own "divider below me" flag. */}
              {sectionIndex > 0 && <View style={[styles.divider, dividerStyle]} />}

              {section.kind === 'single' ? (
                <SingleSection
                  section={section}
                  accentColor={accentColor}
                  onAccentColor={resolvedOnAccentColor}
                  mutedColor={mutedColor}
                  labelFontFamily={labelFontFamily}
                  onSelect={(value) => {
                    section.onChange(value)
                    if (autoDismiss) host.close()
                  }}
                />
              ) : (
                <MultiSection section={section} accentColor={accentColor} onAccentColor={resolvedOnAccentColor} mutedColor={mutedColor} labelFontFamily={labelFontFamily} allClearLabels={allClearLabels} />
              )}
            </View>
          ))}
        </ScrollView>
      </PopoverBody>
    </View>
  )
}

function SingleSection({
  section,
  accentColor,
  onAccentColor,
  mutedColor,
  labelFontFamily,
  onSelect
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  section: SingleSelectSection<any>
  accentColor: string
  onAccentColor: string
  mutedColor: string
  labelFontFamily: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect: (value: any) => void
}) {
  return (
    <>
      {section.options.map((option) => {
        const selected = option.value === section.value
        const rowColor = selected ? onAccentColor : mutedColor
        const itemStyle = [styles.item, selected && { backgroundColor: accentColor }]
        const labelStyle: TextStyle = { fontFamily: labelFontFamily, color: rowColor, fontWeight: selected ? 'bold' : 'normal' }
        const descriptionStyle: TextStyle = { fontFamily: labelFontFamily, color: rowColor }
        return (
          <TouchableRipple key={option.value} onPress={() => onSelect(option.value)} style={itemStyle}>
            <View style={styles.itemRow}>
              {option.icon && <Icon source={option.icon} size={MENU_ITEM_ICON_SIZE} color={rowColor} />}
              <View style={styles.itemLabelColumn}>
                <Text variant='labelLarge' style={labelStyle}>
                  {option.label}
                </Text>
                {option.description && (
                  <Text variant='labelSmall' style={descriptionStyle}>
                    {option.description}
                  </Text>
                )}
              </View>
            </View>
          </TouchableRipple>
        )
      })}
    </>
  )
}

function MultiSection({
  section,
  accentColor,
  onAccentColor,
  mutedColor,
  labelFontFamily,
  allClearLabels
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  section: MultiSelectSection<any>
  accentColor: string
  onAccentColor: string
  mutedColor: string
  labelFontFamily: string
  allClearLabels: { all: string; clear: string }
}) {
  const allSelected = section.value.length === section.options.length

  return (
    <>
      {section.options.map((option, i) => {
        const selected = section.value.includes(option.value)
        const rowColor = selected ? onAccentColor : mutedColor
        // Adjacent rows sit flush against each other (no gap — see styles.item's own lack of
        // margin), so two selected neighbors otherwise each carve a small rounded notch out of what
        // should read as one continuous block. Squaring off just the touching edge is what makes a
        // run of several selected options look like one seamless shape instead of a stack of
        // separately-rounded pills.
        const prevSelected = selected && i > 0 && section.value.includes(section.options[i - 1].value)
        const nextSelected = selected && i < section.options.length - 1 && section.value.includes(section.options[i + 1].value)
        const itemStyle = [styles.item, selected && { backgroundColor: accentColor }, prevSelected && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }, nextSelected && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]
        const labelStyle: TextStyle = { fontFamily: labelFontFamily, color: rowColor, fontWeight: selected ? 'bold' : 'normal' }
        return (
          <TouchableRipple key={option.value} onPress={() => section.onChange(selected ? section.value.filter((v: unknown) => v !== option.value) : [...section.value, option.value])} style={itemStyle}>
            <View style={styles.itemRow}>
              {option.icon && <Icon source={option.icon} size={MENU_ITEM_ICON_SIZE} color={rowColor} />}
              <Text variant='labelLarge' style={[styles.itemLabelFlex, labelStyle]}>
                {option.label}
              </Text>
            </View>
          </TouchableRipple>
        )
      })}

      {section.allClear && (
        <TouchableRipple onPress={() => section.onChange(allSelected ? [] : section.options.map((o) => o.value))} style={styles.item}>
          <Text variant='labelLarge' style={[styles.allClearLabel, { fontFamily: labelFontFamily, color: accentColor }]}>
            {allSelected ? allClearLabels.clear : allClearLabels.all}
          </Text>
        </TouchableRipple>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  allClearLabel: {
    fontWeight: 'bold',
    textAlign: 'center'
  },
  anchor: {
    position: 'relative'
  },
  // React Native Web gives every position:'relative' view an explicit zIndex (0, not 'auto'),
  // which makes each one its own stacking context — so a zIndex set only on the popover content
  // below only wins comparisons within this anchor's own box, not against this anchor's own later
  // siblings (e.g. a Ready button), which are otherwise painted on top by DOM-order tiebreak.
  // Elevating the anchor itself, only while its popover is open, fixes that at the right level.
  anchorOpen: {
    zIndex: 100
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4
  },
  item: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  itemLabelColumn: {
    maxWidth: MENU_ITEM_LABEL_MAX_WIDTH
  },
  itemLabelFlex: {
    flex: 1
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  menu: {
    borderRadius: 12,
    borderWidth: MENU_BORDER_WIDTH,
    elevation: 8,
    maxWidth: MENU_MAX_WIDTH,
    minWidth: MENU_MIN_WIDTH,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  // Separate from `menu` itself — a ScrollView's own style sets the scrolling frame's bounds
  // (including the maxHeight that actually caps it), while padding/gap belong to its
  // contentContainerStyle, which sizes to the *unclamped* content instead of the frame.
  menuContent: {
    gap: 4,
    padding: 6
  },
  // Fixed hit-area regardless of the current option's iconSize, so a small-vs-large trigger icon
  // doesn't shift this picker's position within its row.
  triggerBox: {
    alignItems: 'center',
    height: TRIGGER_SIZE,
    justifyContent: 'center',
    width: TRIGGER_SIZE
  }
})
