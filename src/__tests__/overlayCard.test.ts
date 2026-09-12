import { getOverlayCardColors } from '../overlayCard'

describe('getOverlayCardColors', () => {
  it('returns the literal high-contrast light palette when not dark', () => {
    expect(getOverlayCardColors(false)).toEqual({
      fg: '#000000',
      fgMuted: 'rgba(0,0,0,0.4)',
      cardBg: '#F2F2F2',
      cardBorder: 'rgba(0,0,0,0.2)'
    })
  })

  it('returns the literal high-contrast dark palette when dark', () => {
    expect(getOverlayCardColors(true)).toEqual({
      fg: '#FFFFFF',
      fgMuted: 'rgba(255,255,255,0.4)',
      cardBg: '#111111',
      cardBorder: 'rgba(255,255,255,0.2)'
    })
  })
})
