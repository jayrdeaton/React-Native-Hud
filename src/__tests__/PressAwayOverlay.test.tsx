import { render } from '@testing-library/react'

import { Pressable } from '../__mocks__/react-native'
import { PressAwayOverlay } from '../PressAwayOverlay'

describe('PressAwayOverlay', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<PressAwayOverlay active={false} onPress={() => {}} />)
    expect(container.firstChild).toBeNull()
    expect(Pressable).not.toHaveBeenCalled()
  })

  it('renders a dismiss Pressable when active, invoking onPress when pressed', () => {
    const onPress = jest.fn()
    render(<PressAwayOverlay active onPress={onPress} />)

    expect(Pressable).toHaveBeenCalledTimes(1)
    const props = (Pressable as jest.Mock).mock.calls[0][0]
    expect(props.accessibilityLabel).toBe('Dismiss')
    expect(props.accessibilityRole).toBe('button')

    props.onPress()
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('appends a caller-supplied style onto its own absolute-fill style', () => {
    const style = { backgroundColor: 'red' }
    render(<PressAwayOverlay active onPress={() => {}} style={style} />)

    const props = (Pressable as jest.Mock).mock.calls[0][0]
    expect(props.style).toEqual(expect.arrayContaining([style]))
  })
})
