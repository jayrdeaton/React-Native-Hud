import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

// `@tastic/hud/guide` exists so an app that has none of hud's heavy peers (Hangman: no Skia, no
// @tastic/core, no split-screen) can still use the how-to-play flow. That only holds while nothing
// under src/guide/ ever imports one of them, directly or through the main barrel — a regression here
// wouldn't fail a single unit test above (they mock every peer), it would fail Hangman's Metro bundle
// or install. So the boundary is asserted from the source itself.

const GUIDE_DIR = join(__dirname, '..', 'guide')

// Everything a file under src/guide/ is allowed to pull in: this entry point's own peers, and hud's own
// dependency-light shared card styles.
const ALLOWED = new Set(['react', 'react-native', 'react-native-paper', 'react-native-reanimated', '@rific/auto-paper', '@rific/feedback-press'])
const ALLOWED_RELATIVE = new Set(['../overlayCard'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []))
}

function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"\n]*?from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
}

describe('@tastic/hud/guide import boundary', () => {
  const files = sourceFiles(GUIDE_DIR)

  it('finds the guide sources', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it.each(files.map((file) => [file.replace(GUIDE_DIR, 'src/guide'), file]))('%s imports only guide-safe modules', (_name, file) => {
    for (const specifier of specifiersOf(file)) {
      const ok = specifier.startsWith('./') || ALLOWED.has(specifier) || ALLOWED_RELATIVE.has(specifier)
      expect({ specifier, ok }).toEqual({ specifier, ok: true })
    }
  })

  it('the shared overlay card module it borrows is itself free of heavy peers', () => {
    const overlayCard = join(__dirname, '..', 'overlayCard.ts')
    for (const specifier of specifiersOf(overlayCard)) {
      expect(['react-native']).toContain(specifier)
    }
  })
})
