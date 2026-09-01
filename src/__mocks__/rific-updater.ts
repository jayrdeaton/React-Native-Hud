// Real @rific/updater's useUpdater talks to expo-updates at module scope, which has no jsdom
// equivalent — mocked to a plain jest.fn() BaseSettingsDialog can call and assert against, same
// treatment as react-native-paper/@rific/auto-paper/@rific/feedback-press above.
export const useUpdater = jest.fn(() => ({
  check: jest.fn(),
  checking: false,
  updateReady: false
}))
