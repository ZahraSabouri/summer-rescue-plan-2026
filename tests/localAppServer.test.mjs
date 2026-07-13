import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { startLocalAppServer } from '../src/server/localAppServer.js'

async function withLocalApp(fn) {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'summer-rescue-local-app-'))
  const distDir = path.join(projectRoot, 'dist')
  await fs.mkdir(path.join(distDir, 'assets'), { recursive: true })
  await fs.writeFile(path.join(distDir, 'index.html'), '<!doctype html><title>Summer Rescue</title>', 'utf8')
  await fs.writeFile(path.join(distDir, 'assets', 'app.js'), 'export const ready = true\n', 'utf8')

  const server = await startLocalAppServer({
    projectRoot,
    distDir,
    port: 0,
    apiOptions: { dbEnabled: false },
  })
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    await fn({ baseUrl, projectRoot })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    await fs.rm(projectRoot, { recursive: true, force: true })
  }
}

test('production local server serves the shell, assets, SPA fallback, and tracker API', async () => {
  await withLocalApp(async ({ baseUrl }) => {
    const shell = await fetch(`${baseUrl}/`)
    assert.equal(shell.status, 200)
    assert.match(shell.headers.get('content-type'), /^text\/html/)
    assert.match(await shell.text(), /Summer Rescue/)

    const asset = await fetch(`${baseUrl}/assets/app.js`)
    assert.equal(asset.status, 200)
    assert.match(asset.headers.get('content-type'), /^text\/javascript/)
    assert.match(await asset.text(), /ready = true/)

    const fallback = await fetch(`${baseUrl}/future-path-route`)
    assert.equal(fallback.status, 200)
    assert.match(await fallback.text(), /Summer Rescue/)

    const missingAsset = await fetch(`${baseUrl}/assets/missing.js`)
    assert.equal(missingAsset.status, 404)

    const health = await fetch(`${baseUrl}/api/health`)
    assert.equal(health.status, 200)
    assert.equal((await health.json()).ok, true)

    const unknownApi = await fetch(`${baseUrl}/api/not-real`)
    assert.equal(unknownApi.status, 404)
  })
})

test('production local server supports byte ranges used by PDFs and media', async () => {
  await withLocalApp(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/assets/app.js`, { headers: { Range: 'bytes=0-5' } })
    assert.equal(response.status, 206)
    assert.equal(response.headers.get('content-range'), 'bytes 0-5/26')
    assert.equal(await response.text(), 'export')
  })
})

test('web manifest defines a standalone shell without an offline service worker', async () => {
  const manifestPath = path.resolve('public', 'app.webmanifest')
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))

  assert.equal(manifest.start_url, '/#/today')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.prefer_related_applications, false)
  assert.equal('serviceworker' in manifest, false)

  const iconSizes = new Set(manifest.icons.map((icon) => icon.sizes))
  assert.equal(iconSizes.has('192x192'), true)
  assert.equal(iconSizes.has('512x512'), true)
  assert.equal(manifest.icons.some((icon) => icon.purpose === 'maskable'), true)
  for (const icon of manifest.icons) {
    const iconPath = path.resolve('public', icon.src.replace(/^\//, ''))
    await fs.access(iconPath)
  }
  assert.deepEqual(manifest.shortcuts.map((shortcut) => shortcut.url), [
    '/#/today',
    '/#/schedule',
    '/#/week',
  ])
})
