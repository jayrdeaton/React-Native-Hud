export const LoadSkiaWeb = jest.fn(() => Promise.resolve())
// SkiaGate.web.tsx is a straight re-export of the real WithSkiaWeb, not code of ours that does
// anything — its own test just asserts on identity against this mock, not behavior, so there's
// nothing to simulate here beyond a distinct, checkable reference.
export const WithSkiaWeb = jest.fn(() => null)
