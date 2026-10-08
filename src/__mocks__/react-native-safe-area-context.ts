// Real useSafeAreaInsets reads live device inset measurements from native — no jsdom equivalent, so
// this mock returns deterministic zeros instead, same treatment as every other native-backed peer
// in this directory. RotatedFrame also re-provides insets through the real context object, so that is
// a plain React context here.
import { createContext } from 'react'

export const SafeAreaInsetsContext = createContext<{ top: number; right: number; bottom: number; left: number } | null>(null)

export const useSafeAreaInsets = jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 }))
