import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { openTrackerDb, rebuildProgressFromEvents } from '../src/server/trackerDb.js'

async function withDb(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'summer-rescue-db-'))
  const db = openTrackerDb(path.join(dir, 'app.sqlite'))
  try {
    await fn(db)
  } finally {
    db.close()
    await fs.rm(dir, { recursive: true, force: true })
  }
}

test('migrations create the schema and record the version', async () => {
  await withDb((db) => {
    assert.equal(db.getSchemaVersion(), 1)
    const counts = db.counts()
    assert.equal(counts.cards, 0)
    assert.equal(counts.card_progress, 0)
    assert.ok('checklist_items' in counts)
    assert.ok('notifications' in counts)
  })
})

test('seedCatalog inserts modules, phases, cards, and checklist text', async () => {
  await withDb((db) => {
    const counts = db.seedCatalog({
      modules: [{ id: 'aml', name: 'Applied ML', moduleGroup: 'Applied ML', code: 'CMT307' }],
      phases: ['Phase 2', 'Phase 3'],
      cards: [
        {
          id: 'card-001',
          number: 1,
          title: 'Run Lab 1',
          moduleGroup: 'Applied ML',
          phase: 'Phase 2',
          priority: 'Critical',
          status: 'This Week',
          estimatedHours: 3.5,
          checklist: ['Run notebooks', 'Record dataset shape'],
        },
      ],
    })
    assert.equal(counts.modules, 1)
    assert.equal(counts.phases, 2)
    assert.equal(counts.cards, 1)
    assert.equal(counts.checklist_items, 2)

    const card = db.db.prepare('SELECT title, estimated_hours FROM cards WHERE id = ?').get('card-001')
    assert.equal(card.title, 'Run Lab 1')
    assert.equal(card.estimated_hours, 3.5)

    // Idempotent: re-seeding the same catalog does not duplicate rows.
    const again = db.seedCatalog({
      modules: [{ id: 'aml', name: 'Applied ML', moduleGroup: 'Applied ML', code: 'CMT307' }],
      phases: ['Phase 2', 'Phase 3'],
      cards: [{ id: 'card-001', title: 'Run Lab 1', checklist: ['Run notebooks', 'Record dataset shape'] }],
    })
    assert.equal(again.cards, 1)
    assert.equal(again.checklist_items, 2)

    // A new source revision prunes obsolete base cards but preserves user-created cards.
    db.db.prepare(
      "INSERT INTO cards (id, title, custom, source) VALUES ('custom-1', 'Personal card', 1, 'added-in-app')",
    ).run()
    const rebased = db.seedCatalog({
      cards: [{ id: 'card-002', title: 'New campaign card', checklist: ['New output'] }],
    })
    assert.equal(rebased.cards, 2)
    assert.equal(rebased.checklist_items, 1)
    assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM cards WHERE id = ?').get('card-001').n, 0)
    assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM cards WHERE id = ?').get('custom-1').n, 1)
  })
})

test('projectState mirrors live progress, checklist done-state, notes, and settings', async () => {
  await withDb((db) => {
    db.seedCatalog({
      cards: [{ id: 'card-001', title: 'Run Lab 1', checklist: ['Run notebooks', 'Record dataset shape'] }],
    })

    db.projectState({
      state: {
        settings: { theme: 'dark', mat700Active: true },
        moduleNotes: { aml: 'Focus on labs' },
        cards: {
          'card-001': {
            status: 'Done',
            done: true,
            actualHours: 4,
            checklist: { 'card-001-check-0': true, 'card-001-check-1': false },
            notes: [{ id: 'note-1', text: 'Finished the lab', at: '2026-07-06T10:00:00.000Z' }],
            evidenceEntries: [{ id: 'ev-1', text: 'notebook.ipynb', at: '2026-07-06T10:00:00.000Z' }],
            resourceIds: ['aml-session-1-lab-1-sheet'],
          },
        },
        notifications: {
          'n-1': { id: 'n-1', cardId: 'card-001', title: 'Due today', read: false, createdAt: '2026-07-06T09:00:00.000Z' },
        },
        uploadedResources: [
          {
            id: 'local-aml-note',
            moduleId: 'aml',
            title: 'Lab note',
            path: 'local-data/resources/aml/note.md',
            type: 'MD',
            viewer: 'markdown',
            url: '/api/resources/file/aml/note.md',
            tags: ['lab'],
            size: 128,
          },
        ],
        resourceProgress: { 'aml-session-1-lab-1-sheet': true },
      },
    })

    const progress = db.db.prepare('SELECT status, done, actual_hours FROM card_progress WHERE card_id = ?').get('card-001')
    assert.equal(progress.status, 'Done')
    assert.equal(progress.done, 1)
    assert.equal(progress.actual_hours, 4)

    const checked = db.db.prepare('SELECT done, text FROM checklist_items WHERE id = ?').get('card-001-check-0')
    assert.equal(checked.done, 1)
    // Seeded text must be preserved even though projection did not resend it.
    assert.equal(checked.text, 'Run notebooks')

    const notes = db.db.prepare('SELECT COUNT(*) AS n FROM card_notes WHERE card_id = ?').get('card-001')
    assert.equal(notes.n, 1)

    const evidence = db.db.prepare('SELECT text FROM card_evidence WHERE card_id = ?').get('card-001')
    assert.equal(evidence.text, 'notebook.ipynb')

    const link = db.db.prepare('SELECT COUNT(*) AS n FROM card_resources WHERE card_id = ?').get('card-001')
    assert.equal(link.n, 1)

    const theme = db.db.prepare('SELECT value FROM settings WHERE key = ?').get('theme')
    assert.equal(JSON.parse(theme.value), 'dark')

    const moduleNote = db.db.prepare('SELECT note FROM module_notes WHERE module_id = ?').get('aml')
    assert.equal(moduleNote.note, 'Focus on labs')

    const resource = db.db.prepare('SELECT title, type FROM resources WHERE id = ?').get('local-aml-note')
    assert.equal(resource.title, 'Lab note')
    assert.equal(resource.type, 'MD')

    const reviewed = db.db.prepare('SELECT reviewed FROM resource_reviewed WHERE resource_id = ?').get('aml-session-1-lab-1-sheet')
    assert.equal(reviewed.reviewed, 1)

    const notif = db.db.prepare('SELECT read FROM notifications WHERE id = ?').get('n-1')
    assert.equal(notif.read, 0)
  })
})

test('projectState is a clean re-projection (unlinking a resource removes the row)', async () => {
  await withDb((db) => {
    db.seedCatalog({ cards: [{ id: 'card-001', title: 'Run Lab 1' }] })
    db.projectState({ state: { cards: { 'card-001': { resourceIds: ['r-1', 'r-2'] } } } })
    assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM card_resources WHERE card_id = ?').get('card-001').n, 2)

    db.projectState({ state: { cards: { 'card-001': { resourceIds: ['r-1'] } } } })
    const rows = db.db.prepare('SELECT resource_id FROM card_resources WHERE card_id = ?').all('card-001')
    assert.deepEqual(rows.map((row) => row.resource_id), ['r-1'])
  })
})

test('rebuildProgressFromEvents reconstructs card progress from the typed log', () => {
  const events = [
    { entityType: 'card', entityId: 'card-001', eventType: 'checklist_item.added', occurredAt: '2026-07-06T09:00:00.000Z', payload: { itemId: 'i1', text: 'Step one' } },
    { entityType: 'card', entityId: 'card-001', eventType: 'checklist_item.toggled', occurredAt: '2026-07-06T09:01:00.000Z', payload: { itemId: 'i1', text: 'Step one', done: true } },
    { entityType: 'card', entityId: 'card-001', eventType: 'hours.logged', occurredAt: '2026-07-06T09:02:00.000Z', payload: { hours: 2.5 } },
    { entityType: 'card', entityId: 'card-001', eventType: 'focus_session.completed', occurredAt: '2026-07-06T09:03:00.000Z', payload: { hoursAfter: 3.5 } },
    { entityType: 'card', entityId: 'card-001', eventType: 'note.added', occurredAt: '2026-07-06T09:04:00.000Z', payload: { noteId: 'n1', text: 'a note' } },
    { entityType: 'card', entityId: 'card-001', eventType: 'note.deleted', occurredAt: '2026-07-06T09:05:00.000Z', payload: { noteId: 'n1' } },
    { entityType: 'card', entityId: 'card-001', eventType: 'card.status_changed', occurredAt: '2026-07-06T09:06:00.000Z', payload: { status: 'Done', done: true } },
    // Non-card events must be ignored.
    { entityType: 'tracker', entityId: 'state', eventType: 'state.updated', occurredAt: '2026-07-06T09:07:00.000Z', payload: {} },
  ]

  const [card] = rebuildProgressFromEvents(events)
  assert.equal(card.cardId, 'card-001')
  assert.equal(card.status, 'Done')
  assert.equal(card.done, true)
  assert.equal(card.actualHours, 3.5)
  assert.equal(card.checklist.length, 1)
  assert.equal(card.checklist[0].done, true)
  assert.equal(card.checklist[0].text, 'Step one')
  assert.equal(card.notes.length, 0, 'deleted note should not survive replay')
})

test('recover overlays event-log progress onto the seeded catalog', async () => {
  await withDb((db) => {
    db.seedCatalog({
      cards: [
        { id: 'card-001', title: 'Run Lab 1', status: 'This Week' },
        { id: 'card-002', title: 'Read L1', status: 'Backlog' },
      ],
    })

    const events = [
      { entityType: 'card', entityId: 'card-001', eventType: 'card.done_changed', occurredAt: '2026-07-06T09:00:00.000Z', payload: { done: true, status: 'Done' } },
    ]
    const recovery = db.recover(events)
    assert.equal(recovery.catalogCardCount, 2)
    assert.equal(recovery.rebuiltCardCount, 1)

    const one = recovery.cards.find((card) => card.cardId === 'card-001')
    assert.equal(one.done, true)
    assert.equal(one.status, 'Done')
    assert.equal(one.fromEventLog, true)

    const two = recovery.cards.find((card) => card.cardId === 'card-002')
    assert.equal(two.done, false)
    assert.equal(two.status, 'Backlog', 'untouched cards keep their base status')
    assert.equal(two.fromEventLog, false)
  })
})
