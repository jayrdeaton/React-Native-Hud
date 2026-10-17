import { existsSync, readFileSync } from 'fs'
import { dirname, join, relative } from 'path'

// `@tastic/hud/chrome` exists so an app without hud's heavy peers (Hangman: no Skia, no @tastic/profile,
// no @tastic/split-screen) can still use the fleet's shared dialogs and stats screen. Unlike src/guide/,
// the chrome entry re-exports files that live in src/ itself, side by side with barrel-only files, so a
// directory listing can't define the boundary. This walks the real relative-import graph from
// src/chrome/index.ts instead, so a heavy import added to any shared file it reaches (BaseSettingsDialog
// pulling in split-screen, say) fails here rather than in Hangman's Metro bundle. The unit tests mock
// every peer, so nothing else would catch it.

const SRC = join(__dirname, '..')
const ENTRY = join(SRC, 'chrome', 'index.ts')

// The chrome entry's own peers. @tastic/core and @rific/updater are optional peers of the package, but
// this entry needs them (rotation-aware dialogs, the update flow); Hangman has both. @rific/core is
// the Settings sheet's Keep Awake setting; every app already has it (feedback-press peers on it).
const ALLOWED = new Set(['react', 'react-native', 'react-native-paper', 'react-native-reanimated', 'react-native-safe-area-context', '@rific/auto-paper', '@rific/core', '@rific/feedback-press', '@rific/updater', '@tastic/core'])
// Erased at build time, so allowed only as `import type`.
const TYPE_ONLY_ALLOWED = new Set(['@tastic/achievements'])

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

describe('@tastic/hud/chrome import boundary', () => {
  const { files, unresolved } = walk(ENTRY)
  const name = (file: string) => relative(SRC, file)

  it('reaches every module the entry re-exports', () => {
    expect(unresolved).toEqual([])
    expect(files.map(name)).toEqual(
      expect.arrayContaining([
        'BaseSettingsDialog.tsx',
        'BaseStatsScreen.tsx',
        'ConfirmDialog.tsx',
        'UpdateDialog.tsx',
        'AchievementCatalogSection.tsx',
        'overlayCard.ts',
        // The popover pieces and color picker @tastic/profile 0.16+ imports from here.
        'PopoverBody.tsx',
        'PressAwayOverlay.tsx',
        'usePopoverHost.ts',
        'useAutoAlign.ts',
        'InlineColorPicker.tsx'
      ])
    )
  })

  it('never reaches the main barrel or a profile-dependent module', () => {
    expect(files.map(name)).not.toContain('index.ts')
    expect(files.map(name)).not.toContain('AchievementUnlockList.tsx')
  })

  it.each(files.map((file) => [name(file), file]))('%s imports only chrome-safe packages', (_name, file) => {
    for (const { specifier, typeOnly } of edgesOf(file)) {
      if (specifier.startsWith('.')) continue
      const ok = ALLOWED.has(specifier) || (typeOnly && TYPE_ONLY_ALLOWED.has(specifier))
      expect({ specifier, typeOnly, ok }).toEqual({ specifier, typeOnly, ok: true })
    }
  })

  // react-native and browser both point at the same source entry, which is only right while nothing it
  // reaches has a platform-specific twin (the way SkiaGate.web.tsx needs its own ./skia-gate target).
  it.each(files.map((file) => [name(file), file]))('%s has no .web sibling', (_name, file) => {
    expect(existsSync(file.replace(/\.(tsx?)$/, '.web.$1'))).toBe(false)
  })
})
