// One option in a SectionedDropdown section, or in any menu a loadout builds from the same shape (a
// CPU's difficulty levels). Its own module, free of imports, so `@tastic/hud/lobby` can export it
// without reaching SectionedDropdown.tsx, which imports TriggerGaugeHost and so Skia.
export interface MenuOption<T extends string | number> {
  value: T
  label: string
  description?: string
  // Optional per-option icon - when every option in a single-select section has one, the trigger
  // shows the currently selected option's icon instead of the static fallback, so the value is
  // readable at a glance without opening the dropdown. Unused by multi-select sections (there's no
  // single "the" selected option to show on the trigger).
  icon?: string
  iconSize?: number
}
