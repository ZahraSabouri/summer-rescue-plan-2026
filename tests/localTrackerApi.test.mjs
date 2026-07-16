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
      headers: { 'Content-Type': 'application/json', 'If-Match': '"0"' },
      body: JSON.stringify(statePayload),
    })
    assert.equal(stateWriteResponse.status, 200)

    const stateReadResponse = await fetch(`${baseUrl}/api/state`)
    assert.equal(stateReadResponse.status, 200)
    const storedState = await stateReadResponse.json()
    assert.equal(storedState.revision, 1)
    assert.equal(storedState.writerId, 'unknown')
    assert.deepEqual(storedState.state, statePayload.state)
    assert.equal(stateReadResponse.headers.get('etag'), '"1"')

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

test('state writes require a revision, reject stale tabs, and skip semantic no-op writes', async () => {
  await withApi(async ({ baseUrl, projectRoot }) => {
    const payload = { app: 'summer-rescue-plan-app', state: { version: 4, cards: {}, updatedAt: '2026-07-15T10:00:00.000Z' } }

    const unguarded = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    assert.equal(unguarded.status, 428)

    const first = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"0"', 'X-Writer-Id': 'tab-a' },
      body: JSON.stringify(payload),
    })
    assert.equal(first.status, 200)
    assert.equal((await first.json()).revision, 1)

    const statePath = path.join(projectRoot, 'local-data', 'summer-rescue-tracker-state.json')
    const before = await fs.stat(statePath)
    const noChange = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"1"', 'X-Writer-Id': 'tab-a' },
      body: JSON.stringify({ ...payload, exportedAt: '2026-07-15T11:00:00.000Z' }),
    })
    const noChangeResult = await noChange.json()
    const after = await fs.stat(statePath)
    assert.equal(noChange.status, 200)
    assert.equal(noChangeResult.noChange, true)
    assert.equal(after.mtimeMs, before.mtimeMs)

    const stale = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"0"', 'X-Writer-Id': 'tab-b' },
      body: JSON.stringify({ ...payload, state: { ...payload.state, cards: { lost: { done: true } } } }),
    })
    assert.equal(stale.status, 409)
    const conflict = await stale.json()
    assert.equal(conflict.current.revision, 1)
    assert.equal(conflict.current.writerId, 'tab-a')

    const stored = await (await fetch(`${baseUrl}/api/state`)).json()
    assert.deepEqual(stored.state.cards, {})
  })
})

test('event history quarantines malformed lines and de-duplicates event ids', async () => {
  await withApi(async ({ baseUrl, projectRoot }) => {
    const localData = path.join(projectRoot, 'local-data')
    const progressPath = path.join(localData, 'progress-log.ndjson')
    await fs.mkdir(localData, { recursive: true })
    const valid = {
      id: 'event-existing',
      occurredAt: '2026-07-15T10:00:00.000Z',
      entityType: 'card',
      entityId: 'card-a',
      eventType: 'card.done_changed',
      payload: { done: true },
    }
    await fs.writeFile(progressPath, `${JSON.stringify(valid)}\n-18"}}\n`, 'utf8')

    const history = await (await fetch(`${baseUrl}/api/events`)).json()
    assert.equal(history.ok, true)
    assert.equal(history.events.length, 1)
    assert.equal(history.malformedCount, 1)
    await fs.access(`${progressPath}.quarantine.ndjson`)
    const repaired = await fs.readFile(progressPath, 'utf8')
    assert.doesNotMatch(repaired, /-18/)

    const event = {
      id: 'event-idempotent',
      occurredAt: '2026-07-15T11:00:00.000Z',
      entityType: 'card',
      entityId: 'card-a',
      eventType: 'evidence.added',
      payload: { text: 'proof' },
    }
    const post = () => fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    assert.equal((await post()).status, 201)
    const duplicate = await post()
    assert.equal(duplicate.status, 200)
    assert.equal((await duplicate.json()).duplicate, true)

    const collision = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, payload: { text: 'different' } }),
    })
    assert.equal(collision.status, 409)
  })
})

test('local API rejects cross-site origins and rebuild requires a one-use token', async () => {
  await withApi(async ({ baseUrl }) => {
    const crossSite = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://example.com' } })
    assert.equal(crossSite.status, 403)

    assert.equal((await fetch(`${baseUrl}/api/db/rebuild`)).status, 405)
    assert.equal((await fetch(`${baseUrl}/api/db/rebuild`, { method: 'POST' })).status, 403)

    const token = await (await fetch(`${baseUrl}/api/db/rebuild-token`, { method: 'POST' })).json()
    const first = await fetch(`${baseUrl}/api/db/rebuild`, {
      method: 'POST',
      headers: { 'X-Rebuild-Token': token.token },
    })
    assert.equal(first.status, 200)
    const reused = await fetch(`${baseUrl}/api/db/rebuild`, {
      method: 'POST',
      headers: { 'X-Rebuild-Token': token.token },
    })
    assert.equal(reused.status, 403)
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

test('deleting a card attachment removes the file and index entry; other modules are refused', async () => {
  await withApi(async ({ baseUrl, projectRoot }) => {
    const uploadFile = async (moduleId, fileName) => {
      const response = await fetch(`${baseUrl}/api/resources/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          moduleKey: moduleId,
          fileName,
          title: fileName,
          dataBase64: Buffer.from('proof').toString('base64'),
        }),
      })
      assert.equal(response.status, 201)
      return (await response.json()).resource
    }

    const attachment = await uploadFile('card-attachments', 'email-proof.txt')
    const studyResource = await uploadFile('time-series', 'notes.txt')
    const attachmentPath = path.join(projectRoot, attachment.path.replace(/\//g, path.sep))
    await fs.access(attachmentPath)

    const deleteResponse = await fetch(`${baseUrl}${attachment.url}`, { method: 'DELETE' })
    assert.equal(deleteResponse.status, 200)
    const deleted = await deleteResponse.json()
    assert.equal(deleted.ok, true)
    assert.equal(deleted.fileDeleted, true)
    assert.equal(deleted.indexDeleted, true)
    await assert.rejects(fs.access(attachmentPath))

    const list = await (await fetch(`${baseUrl}/api/resources`)).json()
    assert.deepEqual(list.resources.map((item) => item.id), [studyResource.id])

    // Second delete is idempotent: the file is already gone.
    const repeatResponse = await fetch(`${baseUrl}${attachment.url}`, { method: 'DELETE' })
    assert.equal(repeatResponse.status, 200)
    assert.equal((await repeatResponse.json()).fileDeleted, false)

    const refusedResponse = await fetch(`${baseUrl}${studyResource.url}`, { method: 'DELETE' })
    assert.equal(refusedResponse.status, 403)
    const studyFileResponse = await fetch(`${baseUrl}${studyResource.url}`)
    assert.equal(studyFileResponse.status, 200)
  })
})

test('saving state mirrors it into the SQLite store and reports it in db health', async () => {
  await withApi(async ({ baseUrl }) => {
    const emptyHealth = await (await fetch(`${baseUrl}/api/db/health`)).json()
    assert.equal(emptyHealth.ok, true)
    assert.equal(emptyHealth.available, true)
    assert.equal(emptyHealth.schemaVersion, 1)
    assert.equal(emptyHealth.counts.card_progress, 0)

    const writeResponse = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"0"' },
      body: JSON.stringify({
        app: 'summer-rescue-plan-app',
        state: {
          version: 3,
          settings: { theme: 'dark' },
          cards: {
            'card-001': { status: 'Done', done: true, actualHours: 3 },
          },
        },
      }),
    })
    assert.equal(writeResponse.status, 200)
    const writeResult = await writeResponse.json()
    assert.equal(writeResult.dbMirrored, true)

    const health = await (await fetch(`${baseUrl}/api/db/summary`)).json()
    assert.equal(health.counts.card_progress, 1)
    assert.equal(health.doneCards, 1)
    assert.equal(health.loggedHours, 3)
  })
})

test('db rebuild reconstructs progress from the event log', async () => {
  await withApi(async ({ baseUrl }) => {
    // Seed one card into the catalog by saving it as a custom card.
    await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': '"0"' },
      body: JSON.stringify({
        state: { version: 3, addedCards: [{ id: 'card-x', title: 'Custom card', status: 'Backlog' }], cards: {} },
      }),
    })

    await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'card',
        entityId: 'card-x',
        eventType: 'card.done_changed',
        occurredAt: '2026-07-06T10:00:00.000Z',
        payload: { done: true, status: 'Done' },
      }),
    })

    const tokenResponse = await fetch(`${baseUrl}/api/db/rebuild-token`, { method: 'POST' })
    assert.equal(tokenResponse.status, 201)
    const { token } = await tokenResponse.json()
    const rebuild = await (
      await fetch(`${baseUrl}/api/db/rebuild`, { method: 'POST', headers: { 'X-Rebuild-Token': token } })
    ).json()
    assert.equal(rebuild.ok, true)
    assert.equal(rebuild.eventCount, 1)
    const card = rebuild.cards.find((item) => item.cardId === 'card-x')
    assert.ok(card)
    assert.equal(card.done, true)
    assert.equal(card.status, 'Done')
    assert.equal(card.fromEventLog, true)
  })
})
