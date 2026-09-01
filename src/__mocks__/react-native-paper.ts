import React from 'react'

export const Icon = jest.fn(() => null)

export const IconButton = jest.fn(() => null)

export const Text = jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)

// Real Portal renders into a separate root registered by react-native-paper's own Provider (no
// such host exists under jsdom) — stubbed to render its children inline instead, which is enough
// for a test asserting on content/visibility rather than actual layering.
export const Portal = jest.fn(({ children }: { children?: React.ReactNode }) => children ?? null)
