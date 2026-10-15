export const Canvas = jest.fn(() => null)
export const Path = jest.fn(() => null)

function makePathBuilder() {
  return { addArc: jest.fn(), detach: jest.fn(() => ({})) }
}

export const Skia = {
  PathBuilder: { Make: jest.fn(makePathBuilder) },
  XYWHRect: jest.fn((x: number, y: number, width: number, height: number) => ({ x, y, width, height }))
}
