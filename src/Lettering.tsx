import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { StyleProp, TextStyle } from 'react-native'

// A game's own lettering for the fleet's titles and labels, set once at the app's root (AlphaTastic's
// title font, 2026-11-19). `title` letters BaseStatsScreen's title and each How to Play card's title; `label` the small capital headings
// (StatSection's, AchievementCatalogSection's, the Settings sheet's sections) and @tastic/profile's picker
// pills. Each is laid over the component's own type. Without the provider nothing changes. Dialog titles
// have DialogHeaderStyleProvider.
export interface Lettering {
  title?: StyleProp<TextStyle>
  label?: StyleProp<TextStyle>
}

const LetteringContext = createContext<Lettering>({})

export function LetteringProvider({ title, label, children }: Lettering & { children: ReactNode }) {
  const value = useMemo(() => ({ title, label }), [title, label])
  return <LetteringContext.Provider value={value}>{children}</LetteringContext.Provider>
}

export function useLettering(): Lettering {
  return useContext(LetteringContext)
}
