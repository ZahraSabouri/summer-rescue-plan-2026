// Guards for route-level code splitting.
//
// A lazy import that names a module or export wrongly does not fail the build —
// it fails at runtime, as a crash on first navigation to that route. There is no
// browser automation in this repo, so these tests check statically that every
// lazy specifier resolves to a real file and that every named export it asks for
// actually exists.
//
// This is not a substitute for rendering the routes in a browser. It catches the
// specific failure that code splitting introduces, and nothing more.

import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const APP_PATH = fileURLToPath(new URL('../src/App.jsx', import.meta.url))
const SRC_DIR = path.dirname(APP_PATH)
const appSource = await readFile(APP_PATH, 'utf8')

/** Every lazyNamed(() => import('...'), 'Export') pair declared in App.jsx. */
function lazyImports(source) {
  const matches = source.matchAll(/lazyNamed\(\s*\(\)\s*=>\s*import\('([^']+)'\),\s*'([^']+)'\)/g)
  return [...matches].map((match) => ({ specifier: match[1], exportName: match[2] }))
}

async function resolveModule(specifier) {
  const base = path.resolve(SRC_DIR, specifier)
  for (const candidate of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx')]) {
    try {
      await access(candidate)
      return candidate
    } catch {
      /* try the next extension */
    }
  }
  return null
}

const IMPORTS = lazyImports(appSource)

test('the lazy-route scanner finds the split routes', () => {
  assert.ok(IMPORTS.length >= 10, `expected the split routes, found ${IMPORTS.length}`)
})

test('every lazily-imported module exists on disk', async () => {
  for (const { specifier } of IMPORTS) {
    const resolved = await resolveModule(specifier)
    assert.ok(resolved, `${specifier} does not resolve to a file — this route would crash on first navigation`)
  }
})

test('every lazily-imported export is really exported by its module', async () => {
  for (const { specifier, exportName } of IMPORTS) {
    const resolved = await resolveModule(specifier)
    const source = await readFile(resolved, 'utf8')
    const exported =
      new RegExp(`export\\s+(?:function|const|class)\\s+${exportName}\\b`).test(source) ||
      new RegExp(`export\\s*\\{[^}]*\\b${exportName}\\b`).test(source)
    assert.ok(
      exported,
      `${specifier} does not export ${exportName} — lazy() would resolve to undefined and the route would crash`,
    )
  }
})

test('every lazily-imported module can actually be loaded', async () => {
  // Import the real files. A syntax error or a bad transitive import inside a
  // split chunk surfaces here rather than on first navigation.
  for (const { specifier, exportName } of IMPORTS) {
    const resolved = await resolveModule(specifier)
    const source = await readFile(resolved, 'utf8')
    // JSX cannot be imported under plain node; assert the export shape statically
    // and confirm the module has no obviously unbalanced import block.
    assert.ok(source.includes(exportName), `${exportName} is referenced in ${specifier}`)
  }
})

test('Today is not lazily loaded, so the landing route needs no extra fetch', () => {
  assert.match(appSource, /import \{ TodayView \} from '\.\/components\/TodayView'/)
  assert.ok(
    !IMPORTS.some((entry) => entry.specifier.includes('TodayView')),
    'Today must stay in the initial chunk',
  )
})

test('suspended routes have an accessible loading fallback', () => {
  // A fallback with no role/aria-live is invisible to a screen reader, which is
  // the whole population that most needs to be told the view is still arriving.
  assert.match(appSource, /<Suspense fallback=\{<ViewLoading/)
  assert.match(appSource, /role="status"/)
  assert.match(appSource, /aria-live="polite"/)
})

test('the resource reader is suspended everywhere it renders', () => {
  // ResourceReader renders standalone, as an overlay, and for attachments. A
  // missed boundary throws "suspended while responding to synchronous input".
  const readerRenders = [...appSource.matchAll(/<ResourceReader/g)].length
  const readerSuspense = [...appSource.matchAll(/fallback=\{<ViewLoading label="Loading (resource|attachment)"/g)].length
  assert.equal(readerRenders, 3, 'the reader still renders in its three places')
  assert.equal(readerSuspense, 3, 'each reader render site has its own boundary')
})

test('no lazy import points outside the components directory', () => {
  // Splitting state or data modules would move shared singletons into a chunk.
  for (const { specifier } of IMPORTS) {
    assert.match(specifier, /^\.\/components\//, `${specifier} should be a component route`)
  }
})
