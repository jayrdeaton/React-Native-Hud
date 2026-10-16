# TODO

## React Native 0.88 strict types

Deferred 2026-10-16 so the focus games could ship on Expo SDK 58 the same day: `@infinitetoken/tsconfig` 0.6 resolves React Native 0.88's legacy (pre-strict) types, and React Native removes those after 0.88. Apps type-check this package's source, and under the strict types it fails in 7 places (measured from an SDK 58 app with `customConditions: ["react-native"]` only): `src/InlineColorPicker.tsx:149` (TS2322), `src/LabeledDropdown.tsx:82` (TS2322), `src/SectionedDropdown.tsx:217` (TS2322), `src/guide/HowToPlayDialog.tsx:102` (TS2339), `src/guide/HowToPlayDialog.tsx:138` (TS2322), `src/useAutoAlign.ts:112` (TS2339), `src/useAutoAlign.ts:112` (TS7006), `src/useZoneClampedAlign.ts:107` (TS2339), `src/useZoneClampedAlign.ts:107` (TS7006). Mostly ref and event types moving to the strict instance types. Fix and release before the fleet moves past SDK 58 (see TSConfig's TODO.md).
