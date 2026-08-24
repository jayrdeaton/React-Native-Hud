import { Platform } from 'react-native'

// System monospace — every component here defaults its labels to this unless a consumer passes
// its own `labelFontFamily`, so a game with its own branded/registered font can override it
// without this package needing to know that font exists.
export const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
