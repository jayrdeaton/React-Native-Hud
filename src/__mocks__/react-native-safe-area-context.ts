// Real useSafeAreaInsets reads live device inset measurements from native — no jsdom equivalent, so
// this mock returns deterministic zeros instead, same treatment as every other native-backed peer
// in this directory. Only useSafeAreaInsets is mocked; that's the only export this package's own
// code (useZoneClampedAlign) ever imports from this module.
export const useSafeAreaInsets = jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 }))
