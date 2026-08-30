export const Canvas = jest.fn(() => null)
export const Path = jest.fn(() => null)

function makePath() {
  return { addArc: jest.fn() }
}

export const Skia = {
  Path: { Make: jest.fn(makePath) },
  XYWHRect: jest.fn((x: number, y: number, width: number, height: number) => ({ x, y, width, height }))
}
