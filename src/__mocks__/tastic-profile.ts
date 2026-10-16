// Real @tastic/profile can't be loaded under this package's own test run at all: it declares a
// peer dependency back on @tastic/hud (this very package - a legitimate, intentional cycle at the
// source level, but not one this repo's own Jest run can resolve, since there's no built dist/ to
// hand it while the test run is in progress) and, transitively, requires several native/Expo peers
// this repo carries no test setup for at all (expo-modules-core, react-native-safe-area-context,
// @rific/focus-chain, @rific/toaster). Mocked wholesale, same treatment as every other native- or
// cycle-backed peer in this directory - PlayerSetupPanel.test.tsx only needs to assert which props
// this package's own components wire through to ProfilePicker, not exercise @tastic/profile's own
// popover/list behavior (already covered by that package's own test suite).
export const ProfilePicker = jest.fn(() => null)
// PlayerSetupPanel.test.tsx: the CPU seat's button, and the two sizes the panel places its seat
// button's dropdown with (fixed stand-ins, so a test can tell which one sized it).
export const OptionPicker = jest.fn(() => null)
export const getProfilePickerContentSize = jest.fn(() => ({ width: 220, height: 301 }))
export const getOptionPickerContentSize = jest.fn(() => ({ width: 220, height: 202 }))
// AchievementUnlockList.test.tsx only asserts which profile each row hands ProfileChip.
export const ProfileChip = jest.fn(() => null)
