import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createLocalTrackerApi } from '../src/server/localTrackerApi.js'

async function startApi() {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'summer-rescue-api-'))
  const handler = createLocalTrackerApi({ projectRoot })
  const server = http.createServer((req, res) => {
    handler(req, res, () => {
      res.statusCode = 404
      res.end('not found')
    })
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    projectRoot,
    close: async () => {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
      await fs.rm(projectRoot, { recursive: true, force: true })
    },
  }
}

async function withApi(fn) {
  const api = await startApi()
  try {
    await fn(api)
  } finally {
    await api.close()
  }
}

test('local tracker API reads and writes state and typed events', async () => {
  await withApi(async ({ baseUrl }) => {
    const healthResponse = await fetch(`${baseUrl}/api/health`)
    assert.equal(healthResponse.status, 200)
    const health = await healthResponse.json()
    assert.equal(health.ok, true)
    assert.ok(health.endpoints.includes('/api/events'))
    assert.ok(health.endpoints.includes('/api/resources/upload'))

    const emptyStateResponse = await fetch(`${baseUrl}/api/state`)
    assert.equal(emptyStateResponse.status, 204)

    const statePayload = {
      exportedAt: '2026-07-06T00:00:00.000Z',
      app: 'summer-rescue-plan-app',
      state: {
        version: 3,
        cards: {},
      },
    }
    const stateWriteResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statePayload),
    })
    assert.equal(stateWriteResponse.status, 200)

    const stateReadResponse = await fetch(`${baseUrl}/api/state`)
    assert.equal(stateReadResponse.status, 200)
    assert.deepEqual(await stateReadResponse.json(), statePayload)

    const eventPayload = {
      entityType: 'card',
      entityId: 'card-001',
      eventType: 'checklist_item.toggled',
      payload: {
        itemId: 'card-001-check-0',
        done: true,
      },
    }
    const eventWriteResponse = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    })
    assert.equal(eventWriteResponse.status, 201)

    const eventReadResponse = await fetch(`${baseUrl}/api/events`)
    assert.equal(eventReadResponse.status, 200)
    const events = await eventReadResponse.json()
    assert.equal(events.events.length, 1)
    assert.equal(events.events[0].eventType, 'checklist_item.toggled')
    assert.equal(events.events[0].entityType, 'card')
  })
})

test('local resource upload stores metadata and serves the uploaded file', async () => {
  await withApi(async ({ baseUrl }) => {
    const data = '# Uploaded note\n\nA local markdown resource.\n'
    const uploadResponse = await fetch(`${baseUrl}/api/resources/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleId: 'time-series',
        moduleKey: 'time-series',
        moduleGroup: 'Time Series',
        fileName: '../Uploaded Note?.md',
        title: 'Uploaded Note',
        group: 'Uploaded',
        description: 'Test upload',
        tags: 'test, local',
        priority: 'high',
        dataBase64: Buffer.from(data).toString('base64'),
      }),
    })
    assert.equal(uploadResponse.status, 201)
    const upload = await uploadResponse.json()
    assert.equal(upload.ok, true)
    assert.equal(upload.resource.moduleId, 'time-series')
    assert.equal(upload.resource.type, 'MD')
    assert.equal(upload.resource.viewer, 'markdown')
    assert.match(upload.resource.url, /^\/api\/resources\/file\/time-series\//)
    assert.ok(!upload.resource.path.includes('..'))

    const listResponse = await fetch(`${baseUrl}/api/resources`)
    assert.equal(listResponse.status, 200)
    const list = await listResponse.json()
    assert.equal(list.resources.length, 1)
    assert.equal(list.resources[0].id, upload.resource.id)

    const fileResponse = await fetch(`${baseUrl}${upload.resource.url}`)
    assert.equal(fileResponse.status, 200)
    assert.equal(await fileResponse.text(), data)
  })
})
