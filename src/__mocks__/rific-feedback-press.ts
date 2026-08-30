import React from 'react'

const stub = ({ children }: { children?: React.ReactNode }) => children ?? null

export const TouchableRipple = jest.fn(stub)
export const IconButton = jest.fn(() => null)
