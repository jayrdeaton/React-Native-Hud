import { existsSync, readFileSync } from 'fs'
import { dirname, join, relative } from 'path'

// `@tastic/hud/skia` exists so every app's Skia host files can import loadSkiaWeb from one path, including
// the apps that lack the main barrel's heavier peers. That only holds while nothing it reaches imports
// another package, so the boundary is asserted from the source itself, the way chromeImports.test.ts
// does for ./chrome. Unlike ./chrome, this entry reaches a .web twin on purpose (loadSkiaWeb.web.ts),
// so both platform files are walked, and only the web one may import Skia's /src/web subpath.

const SRC = join(__dirname, '..')
const ENTRY = join(SRC, 'skia', 'index.ts')
const WEB_ONLY = '@shopify/react-native-skia/src/web'

// Comments are stripped first: the loader files explain canvaskit-wasm's `require('fs')` in prose.
function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"\n]*?from\s+['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g)].map((match) => match[1] ?? match[2] ?? match[3])
}

// Every file a relative specifier can resolve to on either platform: the plain file and its .web twin.
function resolveBoth(from: string, specifier: string): string[] {
  const base = join(dirname(from), specifier)
  return [`${base}.ts`, `${base}.tsx`, `${base}.web.ts`, `${base}.web.tsx`, join(base, 'index.ts')].filter((candidate) => existsSync(candidate))
}

function walk(entry: string): string[] {
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift()!
    if (seen.has(file)) continue
    seen.add(file)
    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith('.')) queue.push(...resolveBoth(file, specifier))
    }
  }
  return [...seen]
}

describe('@tastic/hud/skia import boundary', () => {
  const files = walk(ENTRY)
  const name = (file: string) => relative(SRC, file)

  it('reaches exactly the loader, its web twin and the wasm URL rule', () => {
    expect(files.map(name).sort()).toEqual(['loadSkiaWeb.ts', 'loadSkiaWeb.web.ts', 'locateSkiaWebFile.ts', 'skia/index.ts'])
  })

  it('has no .web twin of the entry itself (Metro does not platform-resolve an exports-map target)', () => {
    expect(existsSync(ENTRY.replace(/\.ts$/, '.web.ts'))).toBe(false)
  })

  it.each(files.map((file) => [name(file), file]))('%s imports no package except Skia web, and that only from a .web file', (fileName, file) => {
    for (const specifier of specifiersOf(file)) {
      if (specifier.startsWith('.')) continue
      const ok = specifier === WEB_ONLY && /\.web\.tsx?$/.test(fileName)
      expect({ specifier, ok }).toEqual({ specifier, ok: true })
    }
  })
})
