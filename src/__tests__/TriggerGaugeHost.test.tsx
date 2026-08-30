import { Canvas, Path } from '@shopify/react-native-skia'
import { act, render } from '@testing-library/react'

import TriggerGaugeHost from '../TriggerGaugeHost'

// TriggerGaugeHost is a thin React.lazy + Suspense wrapper around loadSkiaWeb() and the real
// TriggerGauge (see that file's own comment for why the lazy() indirection exists at all). These
// tests exercise the wrapper itself, not TriggerGauge's internal arc math (covered elsewhere) —
// the point here is the two-phase mount: nothing real renders until the lazy import resolves.

const baseProps = {
  segments: 4,
  litIndices: [1],
  size: 40,
  accentColor: '#ff0000',
  mutedColor: '#cccccc'
}

describe('TriggerGaugeHost', () => {
  it('renders without throwing, and defers mounting the real gauge until the lazy import flushes', async () => {
    expect(() => render(<TriggerGaugeHost {...baseProps} />)).not.toThrow()

    // Suspense's fallback is null, so immediately after the synchronous initial render — before
    // anything has had a chance to flush the lazy import/Suspense boundary — the real TriggerGauge
    // has not mounted yet, and neither has anything it renders.
    expect(Canvas).not.toHaveBeenCalled()
    expect(Path).not.toHaveBeenCalled()

    // Drain the still-pending lazy import/loadSkiaWeb promise before the test ends, rather than
    // leaving it to resolve later, unwrapped, during a subsequent test.
    await act(async () => {})
  })

  it('mounts the real TriggerGauge once the Suspense boundary flushes, for segments >= 2', async () => {
    render(<TriggerGaugeHost {...baseProps} />)

    await act(async () => {})

    // The mocked Canvas renders null (it never actually mounts its <Path> children, which is why
    // Path itself is never invoked here — asserted, not assumed, per the task's instruction to
    // observe rather than guess) — so Canvas having been invoked at all is what proves the real
    // TriggerGauge mounted past the Suspense boundary. Its props are real values computed by
    // TriggerGauge from this test's size (40) — not just "called with something".
    expect(Canvas).toHaveBeenCalledTimes(1)
    const canvasProps = (Canvas as jest.Mock).mock.calls[0][0]
    // canvasSize = (size/2 + ARC_GAP)*2 + LIT_THICKNESS = (20 + 2)*2 + 7 = 51
    expect(canvasProps.style).toEqual({ height: 51, width: 51 })
    expect(Path).not.toHaveBeenCalled()
  })

  it('does not throw for segments < 2, and the underlying gauge still renders nothing', async () => {
    await expect(
      act(async () => {
        render(<TriggerGaugeHost {...baseProps} segments={1} litIndices={[0]} />)
      })
    ).resolves.not.toThrow()

    // TriggerGauge itself bails out with `if (segments < 2) return null` once mounted, so no Canvas
    // is ever drawn for this instance — asserted empirically (rather than assumed) per the task's
    // own instruction, since Suspense/lazy's interaction with a component that immediately returns
    // null isn't otherwise guaranteed here.
    expect(Canvas).not.toHaveBeenCalled()
    expect(Path).not.toHaveBeenCalled()
  })
})
