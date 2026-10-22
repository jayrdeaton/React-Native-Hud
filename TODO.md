# TODO

## React Native 0.88 strict types

Deferred 2026-10-16 so the focus games could ship on Expo SDK 58 the same day; this repo's own errors were fixed on 2026-10-22 (see CLAUDE.md, "Strict ref types, placement bounds and drawn swatches"). Left, checked with `npx tsc --noEmit -p tsconfig.json --customConditions strict-check` (any condition that drops `react-native-legacy-deep-imports`):

1. **`src/PlayerSetupPanel.tsx` (two TS2322s)** hands hud's `AlignResult` to `@tastic/profile`'s pickers, whose published types still type the trigger ref as `RefObject<View>`. Move the `@tastic/profile` devDependency to the release that adopts `ViewInstance` and they go.
2. **`@shopify/react-native-skia`'s own source** (`NodeHandle`, `ViewComponent`, one possibly-undefined) fails under the strict types; it's a dev dependency here, so that's Skia's to fix.
3. When the fleet drops the legacy types (see TSConfig's TODO.md), drop `react-native-legacy-deep-imports` from this repo's `tsconfig.json` too.
