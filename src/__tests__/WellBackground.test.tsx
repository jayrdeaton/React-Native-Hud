import { BlurView, useBlur, useBlurModule } from '@rific/auto-paper'
import { render } from '@testing-library/react'
import { Platform } from 'react-native'

import { mockViewRender } from '../__mocks__/react-native'
import { WellBackground } from '../WellBackground'

const flatten = (style: unknown): Record<string, unknown>[] =>
  ([] as unknown[])
    .concat(style as never)
    .flat(Infinity)
    .filter(Boolean) as Record<string, unknown>[]
const viewStyles = (): Record<string, unknown>[][] => (mockViewRender as jest.Mock).mock.calls.map((call) => flatten((call[0] as { style?: unknown }).style))
const blurCalls = () => (BlurView as unknown as jest.Mock).mock.calls

// An app that handed expo-blur to auto-paper's Provider
const withExpoBlur = () => (useBlurModule as jest.Mock).mockImplementation(() => ({ BlurView: () => null }))

describe('WellBackground', () => {
  afterEach(() => {
    ;(useBlurModule as jest.Mock).mockImplementation(() => undefined)
    ;(useBlur as jest.Mock).mockImplementation((override?: boolean) => override ?? true)
    Platform.OS = 'ios'
  })

  it("frosts while Blur is on in an app with expo-blur, clipped to the well's corners", () => {
    withExpoBlur()
    render(<WellBackground radius={12} />)
    expect(blurCalls()).toHaveLength(1)
    const style = flatten(blurCalls()[0][0].style)
    expect(style.some((e) => e.borderRadius === 12)).toBe(true)
    expect(style.some((e) => e.overflow === 'hidden')).toBe(true)
  })

  it("is the theme's solid surface with Blur off", () => {
    withExpoBlur()
    ;(useBlur as jest.Mock).mockImplementation(() => false)
    render(<WellBackground radius={12} />)
    expect(blurCalls()).toHaveLength(0)
    expect(viewStyles().some((entries) => entries.some((e) => e.backgroundColor === '#00000f'))).toBe(true)
  })

  it('is solid in an app that never handed expo-blur to auto-paper', () => {
    render(<WellBackground radius={12} />)
    expect(blurCalls()).toHaveLength(0)
  })

  it("is solid on Android, where auto-paper's BlurView has no blur target for it", () => {
    withExpoBlur()
    Platform.OS = 'android'
    render(<WellBackground radius={12} />)
    expect(blurCalls()).toHaveLength(0)
  })

  it("paints a caller's own color solid, never frosted", () => {
    withExpoBlur()
    render(<WellBackground radius={12} color='#333333' />)
    expect(blurCalls()).toHaveLength(0)
    expect(viewStyles().some((entries) => entries.some((e) => e.backgroundColor === '#333333'))).toBe(true)
  })
})
