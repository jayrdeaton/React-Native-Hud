import React from 'react'

const stub = ({ children }: { children?: React.ReactNode }) => children ?? null

export const TouchableRipple = jest.fn(stub)
export const IconButton = jest.fn(() => null)
export const Button = jest.fn(stub)

export const SoundContext = React.createContext({ selection: jest.fn(), notification: jest.fn() })

export const useHapticSettings = jest.fn(() => ({
  settings: { vibrate: true },
  set: jest.fn()
}))

export const useSoundSettings = jest.fn(() => ({
  settings: { enabled: true },
  set: jest.fn()
}))

export const useVibration = jest.fn(() => ({
  isEnabled: true,
  selection: jest.fn(),
  notification: jest.fn(),
  short: jest.fn(),
  medium: jest.fn(),
  long: jest.fn(),
  forceShort: jest.fn(),
  forceMedium: jest.fn(),
  forceLong: jest.fn()
}))
