import { Button } from '@rific/feedback-press'
import { act, render } from '@testing-library/react'
import { useEffect } from 'react'

import { GuideProvider, useAutoShowGuide, useGuide } from '../guide/GuideProvider'
import type { GuideStep } from '../guide/types'

const twoSteps: GuideStep[] = [
  { title: 'Swipe to steer', body: 'Swipe in any direction.' },
  { title: 'Avoid every trail', body: 'Last cycle riding wins.' }
]
const oneStep: GuideStep[] = [twoSteps[0]]

// Same "latest captured onPress" technique HowToPlayDialog.test.tsx uses — the Button mock's call
// list accumulates within a test, and a button's onPress closes over the render it came from.
function pressButton(label: string) {
  const matches = (Button as jest.Mock).mock.calls.filter(([props]) => props.children === label)
  if (matches.length === 0) throw new Error(`No Button rendered with label "${label}"`)
  act(() => {
    matches[matches.length - 1][0].onPress()
  })
}

function AutoShow({ enabled }: { enabled?: boolean }) {
  useAutoShowGuide(enabled)
  return null
}

function Probe({ capture }: { capture: (guide: ReturnType<typeof useGuide>) => void }) {
  const guide = useGuide()
  // A block body, not `() => capture(guide)`: an arrow returning capture's value would hand React a
  // non-function as this effect's cleanup.
  useEffect(() => {
    capture(guide)
  })
  return null
}

const baseProps = { steps: twoSteps, currentVersion: 1, seenVersion: 0, onSeen: jest.fn() }

describe('GuideProvider', () => {
  it('renders its children and stays closed by default', () => {
    const { container, unmount } = render(
      <GuideProvider {...baseProps}>
        <>child content</>
      </GuideProvider>
    )

    expect(container.textContent).toContain('child content')
    expect(container.textContent).not.toContain('Swipe to steer')
    unmount()
  })

  describe('auto-show', () => {
    it("opens when the player hasn't seen this version", () => {
      const { container, unmount } = render(
        <GuideProvider {...baseProps}>
          <AutoShow />
        </GuideProvider>
      )

      expect(container.textContent).toContain('Swipe to steer')
      unmount()
    })

    it('stays closed when the player has already seen this version', () => {
      const { container, unmount } = render(
        <GuideProvider {...baseProps} seenVersion={1}>
          <AutoShow />
        </GuideProvider>
      )

      expect(container.textContent).not.toContain('Swipe to steer')
      unmount()
    })

    it('reopens for a version bump — an older seen version is unseen again', () => {
      const { container, unmount } = render(
        <GuideProvider {...baseProps} currentVersion={2} seenVersion={1}>
          <AutoShow />
        </GuideProvider>
      )

      expect(container.textContent).toContain('Swipe to steer')
      unmount()
    })

    it('is held back while `enabled` is false, and fires once it flips true', () => {
      const { container, rerender, unmount } = render(
        <GuideProvider {...baseProps}>
          <AutoShow enabled={false} />
        </GuideProvider>
      )
      expect(container.textContent).not.toContain('Swipe to steer')

      rerender(
        <GuideProvider {...baseProps}>
          <AutoShow enabled />
        </GuideProvider>
      )
      expect(container.textContent).toContain('Swipe to steer')
      unmount()
    })

    it('fires at most once per session, even when Home remounts', () => {
      const onSeen = jest.fn()
      // seenVersion deliberately never updates here (a parent that hadn't written it back yet) —
      // the once-per-session guard must hold on its own, not lean on the persisted flag.
      const tree = (showHome: boolean) => (
        <GuideProvider {...baseProps} onSeen={onSeen}>
          {showHome && <AutoShow />}
        </GuideProvider>
      )
      const { container, rerender, unmount } = render(tree(true))
      expect(container.textContent).toContain('Swipe to steer')

      pressButton('Skip')
      expect(container.textContent).not.toContain('Swipe to steer')

      rerender(tree(false))
      rerender(tree(true))
      expect(container.textContent).not.toContain('Swipe to steer')
      unmount()
    })
  })

  describe('persistence callback', () => {
    it('Skip on an unseen guide calls onSeen with the current version and closes', () => {
      const onSeen = jest.fn()
      const { container, unmount } = render(
        <GuideProvider {...baseProps} currentVersion={3} onSeen={onSeen}>
          <AutoShow />
        </GuideProvider>
      )

      pressButton('Skip')

      expect(onSeen).toHaveBeenCalledTimes(1)
      expect(onSeen).toHaveBeenCalledWith(3)
      expect(container.textContent).not.toContain('Swipe to steer')
      unmount()
    })

    it('finishing calls onSeen exactly like skipping does', () => {
      const onSeen = jest.fn()
      const { container, unmount } = render(
        <GuideProvider {...baseProps} steps={oneStep} onSeen={onSeen}>
          <AutoShow />
        </GuideProvider>
      )

      pressButton('Ready')

      expect(onSeen).toHaveBeenCalledWith(1)
      expect(container.textContent).not.toContain('Swipe to steer')
      unmount()
    })

    it('a replay by someone who has already seen it never writes anything', () => {
      const onSeen = jest.fn()
      let guide!: ReturnType<typeof useGuide>
      const { container, unmount } = render(
        <GuideProvider {...baseProps} seenVersion={1} steps={oneStep} onSeen={onSeen}>
          <Probe capture={(g) => (guide = g)} />
        </GuideProvider>
      )

      act(() => guide.open())
      expect(container.textContent).toContain('Swipe to steer')
      pressButton('Ready')

      expect(container.textContent).not.toContain('Swipe to steer')
      expect(onSeen).not.toHaveBeenCalled()
      unmount()
    })

    it('a replay restarts on the first card', () => {
      let guide!: ReturnType<typeof useGuide>
      const { container, unmount } = render(
        <GuideProvider {...baseProps} seenVersion={1}>
          <Probe capture={(g) => (guide = g)} />
        </GuideProvider>
      )

      act(() => guide.open())
      pressButton('Next')
      act(() => guide.close())
      act(() => guide.open())

      // Both pages are always in the tree (paging ScrollView), so page text can't tell them apart —
      // Skip can: it's only ever offered on the first card.
      expect(container.textContent).toContain('Skip')
      unmount()
    })
  })

  describe('useGuide', () => {
    it('reports isOpen', () => {
      let guide!: ReturnType<typeof useGuide>
      const { unmount } = render(
        <GuideProvider {...baseProps} seenVersion={1}>
          <Probe capture={(g) => (guide = g)} />
        </GuideProvider>
      )
      expect(guide.isOpen).toBe(false)

      act(() => guide.open())
      expect(guide.isOpen).toBe(true)
      unmount()
    })

    it('is a harmless no-op with no provider above it — an app test rendering Settings or Home on its own', () => {
      let guide!: ReturnType<typeof useGuide>
      const { unmount } = render(<Probe capture={(g) => (guide = g)} />)

      expect(() => {
        guide.open()
        guide.close()
        guide.requestAutoShow()
      }).not.toThrow()
      expect(guide.isOpen).toBe(false)
      unmount()
    })
  })
})
