import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, join, relative } from 'path'

// `@tastic/hud/lobby` exists so an app with no Skia can still load a two-seat loadout: @tastic/shell is
// one barrel, so every pack on it loads its loadout, and CardTastic (Solitaire, renamed) dropped Skia on
// 2026-10-18. Like the chrome entry, it re-exports files that sit in src/ beside barrel-only ones, so this
// walks the real relative-import graph from src/lobby/index.ts (the same walk as chromeImports.test.ts).
// A Skia import added to any file it reaches (PlayerSetupPanel pulling in SectionedDropdown, say) fails
// here rather than in that app's Metro bundle and tsc. The unit tests mock every peer, so nothing else
// would catch it.

const SRC = join(__dirname, '..')
const ENTRY = join(SRC, 'lobby', 'index.ts')
const NODE_MODULES = join(SRC, '..', 'node_modules')

// The lobby entry's peers: chrome's, plus @tastic/profile (PlayerSetupPanel's pickers) and
// @tastic/split-screen (useZoneClampedAlign's zone bounds). The last test below checks neither reaches
// Skia or the main barrel itself.
const ALLOWED = new Set(['react', 'react-native', 'react-native-paper', 'react-native-reanimated', 'react-native-safe-area-context', '@rific/auto-paper', '@rific/feedback-press', '@tastic/core', '@tastic/profile', '@tastic/split-screen'])
const SKIA = '@shopify/react-native-skia'

type Edge = { specifier: string; typeOnly: boolean }

// A static `import`/`export ... from` (type-only when it's `import type`, or when every name in its
// braces is marked `type`), plus bare side-effect imports, dynamic import() and require(), which a
// from-only pattern would miss.
function edgesOf(file: string): Edge[] {
  const source = readFileSync(file, 'utf8')
  const edges: Edge[] = []
  for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^'"]*?)\s*from\s+['"]([^'"]+)['"]/g)) {
    const typeOnly = Boolean(match[1]) || /^\{\s*(?:type\s+[\w$]+(?:\s+as\s+[\w$]+)?\s*,?\s*)+\}$/.test(match[2].trim())
    edges.push({ specifier: match[3], typeOnly })
  }
  for (const match of source.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    edges.push({ specifier: match[1] ?? match[2] ?? match[3], typeOnly: false })
  }
  return edges
}

function resolveRelative(from: string, specifier: string): string | null {
  const base = join(dirname(from), specifier)
  return [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find((candidate) => existsSync(candidate)) ?? null
}

// Follows type-only relative edges too: a bundler that kept one would load the file, so the boundary
// can't lean on it being erased.
function walk(entry: string): { files: string[]; unresolved: string[] } {
  const seen = new Set<string>()
  const unresolved: string[] = []
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift()!
    if (seen.has(file)) continue
    seen.add(file)
    for (const { specifier } of edgesOf(file)) {
      if (!specifier.startsWith('.')) continue
      const resolved = resolveRelative(file, specifier)
      if (resolved) queue.push(resolved)
      else unresolved.push(`${relative(SRC, file)} -> ${specifier}`)
    }
  }
  return { files: [...seen], unresolved }
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? (entry.name === '__tests__' || entry.name === '__mocks__' ? [] : sourceFiles(join(dir, entry.name))) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []))
}

describe('@tastic/hud/lobby import boundary', () => {
  const { files, unresolved } = walk(ENTRY)
  const name = (file: string) => relative(SRC, file)

  it('reaches every module the entry re-exports', () => {
    expect(unresolved).toEqual([])
    expect(files.map(name)).toEqual(expect.arrayContaining(['menuOption.ts', 'PlayerSetupPanel.tsx', 'ReadyButton.tsx', 'SharedActionBand.tsx', 'useZoneClampedAlign.ts']))
  })

  it('never reaches the main barrel or a module that loads Skia', () => {
    const reached = files.map(name)
    for (const file of ['index.ts', 'SectionedDropdown.tsx', 'TriggerGaugeHost.tsx', 'TriggerGauge.tsx', 'loadSkiaWeb.ts', 'loadSkiaWeb.web.ts', 'locateSkiaWebFile.ts']) {
      expect(reached).not.toContain(file)
    }
  })

  it.each(files.map((file) => [name(file), file]))('%s imports only lobby-safe packages', (_name, file) => {
    for (const { specifier, typeOnly } of edgesOf(file)) {
      if (specifier.startsWith('.')) continue
      const ok = ALLOWED.has(specifier)
      expect({ specifier, typeOnly, ok }).toEqual({ specifier, typeOnly, ok: true })
    }
  })

  // react-native and browser both point at the same source entry, which is only right while nothing it
  // reaches has a platform-specific twin.
  it.each(files.map((file) => [name(file), file]))('%s has no .web sibling', (_name, file) => {
    expect(existsSync(file.replace(/\.(tsx?)$/, '.web.$1'))).toBe(false)
  })

  // The two packages this entry adds to chrome's are what a Skia-free app installs alongside it, so a
  // release of either that pulled in Skia or hud's main barrel would undo the entry. Checked against the
  // versions installed here (the devDependencies), the source an app's Metro and tsc read.
  it.each(['@tastic/profile', '@tastic/split-screen'])('%s reaches neither Skia nor the main barrel', (pkg) => {
    const files = sourceFiles(join(NODE_MODULES, pkg, 'src'))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      for (const { specifier } of edgesOf(file)) {
        const ok = specifier !== SKIA && specifier !== '@tastic/hud'
        expect({ file: relative(NODE_MODULES, file), specifier, ok }).toEqual({ file: relative(NODE_MODULES, file), specifier, ok: true })
      }
    }
  })
})
