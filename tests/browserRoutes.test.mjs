// Browser interaction tests.
//
// These drive the real production build in a real browser. They run against an
// ISOLATED server instance on its own port with a disposable local-data
// directory, never the live app on 5173 — the app seeds weekly routine cards on
// mount and writes state, so pointing a test browser at the real instance would
// mutate a month of campaign work.
//
// Requires playwright-core plus an installed Chromium-family browser. If neither
// is present the suite skips rather than failing, so `npm test` still passes on
// a machine without a browser.

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url))
const PORT = 5199 // deliberately not 5173: never touch the live instance
const BASE = `http://127.0.0.1:${PORT}`

// The 20 destinations. Kept as data so a lost route fails loudly.
const ROUTES = [
  ['today', 'Today'],
  ['hub', 'Study Hub'],
  ['aml', 'Applied ML'],
  ['time-series', 'Time Series'],
  ['project', 'Team Project'],
  ['mat700', 'Data Mining'],
  ['schedule', 'Schedule'],
  ['review', 'Review'],
  ['planner', 'Planner'],
  ['progress', 'Progress'],
  ['analytics', 'Analytics'],
  ['board', 'Columns'],
  ['table', 'Table'],
  ['week', 'Week'],
  ['evidence', 'Evidence'],
  ['rescue', 'Rescue Lane'],
  ['capacity', 'Project Capacity'],
  ['jobs', 'Job Hunt'],
  ['admin', 'Admin & Dates'],
  ['areas', 'Life, Health & Admin'],
]

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
]

async function loadDeps() {
  try {
    const { chromium } = await import('playwright-core')
    const { startLocalAppServer } = await import('../src/server/localAppServer.js')
    return { chromium, startLocalAppServer }
  } catch {
    return null
  }
}

async function launch(chromium) {
  for (const channel of ['msedge', 'chrome', 'chromium']) {
    try {
      return await chromium.launch({ channel, headless: true })
    } catch {
      /* try the next channel */
    }
  }
  return null
}

const deps = await loadDeps()
const browser = deps ? await launch(deps.chromium) : null
const SKIP = !deps || !browser ? 'playwright-core or a Chromium-family browser is unavailable' : false

let server
let dataDir

if (!SKIP) {
  // An isolated profile: fresh local-data, so the app seeds its own state and
  // the real tracker file is never opened.
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'summer-rescue-ui-'))
  await fs.mkdir(path.join(dataDir, 'resources'), { recursive: true })
  server = await deps.startLocalAppServer({
    projectRoot: PROJECT_ROOT,
    port: PORT,
    apiOptions: { localDataDir: dataDir },
  })
}

test.after(async () => {
  if (browser) await browser.close()
  if (server) await new Promise((resolve) => server.close(resolve))
  if (dataDir) await fs.rm(dataDir, { recursive: true, force: true })
})

/** Open a route and wait for the shell heading, dismissing the intro. */
async function openRoute(page, route) {
  await page.goto(`${BASE}/#/${route}`, { waitUntil: 'domcontentloaded' })
  // The intro screen gates the shell on first load.
  const enter = page.getByRole('button', { name: /enter|open|start|continue|skip/i }).first()
  if (await enter.isVisible().catch(() => false)) await enter.click().catch(() => {})
  await page.waitForSelector('h1', { timeout: 10000 })
  // Let a lazy route chunk resolve.
  await page.waitForFunction(() => !document.body.textContent.includes('Loading '), { timeout: 10000 }).catch(() => {})
}

async function crashed(page) {
  const text = (await page.textContent('body')) ?? ''
  return /something went wrong|unexpected error|error boundary/i.test(text)
}

test('the isolated test server serves the production build', { skip: SKIP }, async () => {
  const page = await browser.newPage()
  try {
    const response = await page.goto(`${BASE}/#/today`, { waitUntil: 'domcontentloaded' })
    assert.equal(response.status(), 200)
    assert.match(await page.title(), /Summer Rescue/)
  } finally {
    await page.close()
  }
})

test('the test server is not the live instance', { skip: SKIP }, () => {
  assert.notEqual(PORT, 5173, 'the live app must never be driven by tests')
  assert.ok(dataDir.includes('summer-rescue-ui-'), 'an isolated data directory is in use')
})

test('all 20 routes render without a crash panel', { skip: SKIP }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    const failures = []
    for (const [route, label] of ROUTES) {
      await openRoute(page, route)
      if (await crashed(page)) failures.push(`${label} (#/${route}) rendered a crash panel`)
      const headings = await page.locator('h1').count()
      if (headings !== 1) failures.push(`${label} (#/${route}) exposes ${headings} h1 elements, expected 1`)
    }
    assert.deepEqual(failures, [])
  } finally {
    await page.close()
  }
})

test('no route overflows the document horizontally at any supported size', { skip: SKIP }, async () => {
  const failures = []
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    try {
      for (const [route, label] of ROUTES) {
        await openRoute(page, route)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        // Horizontal density belongs inside a scroll container, never the body.
        if (overflow > 1) failures.push(`${label} (#/${route}) overflows by ${overflow}px at ${viewport.name}`)
      }
    } finally {
      await page.close()
    }
  }
  assert.deepEqual(failures, [])
})

test('the route heading receives focus on navigation', { skip: SKIP }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await openRoute(page, 'today')
    await openRoute(page, 'progress')
    // Suspending a lazy view body must not steal focus from the shell heading.
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    assert.equal(focusedTag, 'H1', 'the page heading is focused after navigation')
  } finally {
    await page.close()
  }
})

test('a lazily-loaded route resolves and renders its content', { skip: SKIP }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const failed = []
  page.on('requestfailed', (request) => failed.push(request.url()))
  page.on('pageerror', (error) => failed.push(String(error)))
  try {
    // Analytics and the module workspaces are split into their own chunks.
    await openRoute(page, 'analytics')
    assert.ok(!(await crashed(page)), 'Analytics renders after its chunk loads')
    await openRoute(page, 'aml')
    assert.ok(!(await crashed(page)), 'the Applied ML workspace renders after its chunk loads')
    assert.deepEqual(failed, [], 'no chunk request or page error occurred')
  } finally {
    await page.close()
  }
})

test('Settings opens, traps focus, and Escape closes it', { skip: SKIP }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await openRoute(page, 'today')
    const opener = page.getByRole('button', { name: /settings and data/i }).first()
    await opener.click()
    const dialog = page.getByRole('dialog').first()
    await dialog.waitFor({ state: 'visible', timeout: 5000 })

    // Focus must start inside the dialog, not behind it.
    const focusInside = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]')
      return Boolean(dialogEl && dialogEl.contains(document.activeElement))
    })
    assert.ok(focusInside, 'initial focus lands inside the dialog')

    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    assert.ok(!(await crashed(page)))
  } finally {
    await page.close()
  }
})

test('Settings exposes the three module exam-date fields as unconfirmed', { skip: SKIP }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await openRoute(page, 'today')
    await page.getByRole('button', { name: /settings and data/i }).first().click()
    await page.getByRole('dialog').first().waitFor({ state: 'visible', timeout: 5000 })

    for (const label of [/Applied ML exam/i, /Time Series exam/i, /MAT700 exam/i]) {
      const field = page.getByLabel(label).first()
      await field.waitFor({ state: 'visible', timeout: 5000 })
      assert.equal(await field.inputValue(), '', 'no fabricated exam date is prefilled')
    }
    const body = (await page.textContent('body')) ?? ''
    assert.match(body, /Unconfirmed/i, 'the unconfirmed state is visible')
  } finally {
    await page.close()
  }
})

test('Admin & Dates shows the exam window and unconfirmed module dates', { skip: SKIP }, async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await openRoute(page, 'admin')
    const body = (await page.textContent('body')) ?? ''
    assert.match(body, /2026-08-17/, 'the exam window start is shown')
    assert.match(body, /2026-08-28/, 'the exam window end is shown')
    assert.match(body, /Unconfirmed/i, 'module dates are shown as unconfirmed')
  } finally {
    await page.close()
  }
})
