import { Button } from '@rific/feedback-press'
import { render } from '@testing-library/react'

import { overlayActionStyles } from '../overlayCard'
import { SecondaryButton } from '../SecondaryButton'

function lastButtonProps() {
  return (Button as jest.Mock).mock.lastCall![0]
}

describe('SecondaryButton', () => {
  beforeEach(() => (Button as jest.Mock).mockClear())

  it('is outlined, labeled in the card text color and sized as an action-row button', () => {
    const onPress = jest.fn()
    render(<SecondaryButton onPress={onPress}>Quit</SecondaryButton>)
    const props = lastButtonProps()
    expect(props.mode).toBe('outlined')
    // useOverlayCardColors' fg is the theme's onSurface (the auto-paper mock's '#000002').
    expect(props.textColor).toBe('#000002')
    expect([props.style].flat()).toContain(overlayActionStyles.actionButton)
    expect(props.onPress).toBe(onPress)
    expect(props.children).toBe('Quit')
  })

  it('lets every default be overridden', () => {
    const extra = { marginTop: 4 }
    render(
      <SecondaryButton mode='text' textColor='red' style={extra}>
        Back
      </SecondaryButton>
    )
    const props = lastButtonProps()
    expect(props.mode).toBe('text')
    expect(props.textColor).toBe('red')
    expect([props.style].flat()).toEqual([overlayActionStyles.actionButton, extra])
  })
})
