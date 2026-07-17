// SQLite authority migration — parity harness (gates only).
//
// The migration brief is explicit: prepare a parity harness first, and only move
// authority if every gate passes. This file runs the gates. It does not switch
// authority, and it is written so that it fails loudly if someone tries to claim
// parity that does not exist.
//
// Result today: gates 1, 2 and 4 pass. Gate 3 (semantic parity) FAILS on ten
// domains the schema cannot represent, five of which are campaign-critical
// (day logs, focus sessions, snapshots, activity, card edits). JSON therefore
// stays authoritative. See SQLITE_PARITY_EXCLUSIONS.

import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { SQLITE_PARITY_EXCLUSIONS, openTrackerDb } from '../src/server/trackerDb.js'

async function withDb(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'summer-rescue-parity-'))
  const db = openTrackerDb(path.join(dir, 'app.sqlite'))
  try {
    return await fn(db)
  } finally {
    db.close()
    await fs.rm(dir, { recursive: true, force: true })
  }
}

const CATALOG = {
  modules: [{ id: 'time-series', name: 'Time Series' }],
  phases: [{ id: 'phase-0', name: 'Phase 0' }],
  cards: [
    {
      id: 'card-001',
      number: '1',
      title: 'Revise CLT',
      moduleGroup: 'Time Series',
      phase: 'Phase 0',
      priority: 'High',
      status: 'Backlog',
      estimatedHours: 2,
      checklist: ['Read notes', 'Do exercises'],
    },
  ],
}

// A representative live state: the two completed historical records, real
// progress, and every domain the brief lists as needing to survive.
function representativeState() {
  return {
    schemaVersion: 4,
    revision: 18,
    state: {
      version: 4,
      cards: {
        'card-001': {
          status: 'Done',
          done: true,
          actualHours: 3.25,
          progressPercent: 100,
          // Checklist state is keyed by the ids seedCatalog derives from the
          // catalogue card, not by arbitrary ids.
          checklist: { 'card-001-check-0': true, 'card-001-check-1': false },
          notes: [{ id: 'n1', text: 'Derivation was the hard part', at: '2026-07-16T10:00:00.000Z' }],
          evidenceEntries: [
            { id: 'e1', text: 'Worked solutions photo', at: '2026-07-16T11:00:00.000Z', url: '/uploads/e1.png', fileName: 'e1.png' },
          ],
          resourceIds: ['res-1'],
          focusSessions: [{ id: 'f1', minutes: 50, at: '2026-07-16T09:00:00.000Z' }],
          activity: [{ action: 'Marked done', at: '2026-07-16T11:05:00.000Z' }],
          userTags: ['tricky'],
          updatedAt: '2026-07-16T11:05:00.000Z',
        },
      },
      addedCards: [
        {
          id: 'custom-1',
          number: 'A1',
          title: 'Confirm assessment dates',
          module: 'Admin',
          moduleGroup: 'Admin',
          phase: 'Phase 0',
          priority: 'High',
          status: 'Done',
          estimatedHours: 0.25,
          dueDate: '2026-07-16',
          startDate: '2026-07-16',
          sortOrder: 1000,
          custom: true,
        },
      ],
      moduleNotes: { 'time-series': 'Focus on stationarity' },
      notifications: {
        'exam:t-30': { id: 'exam:t-30', type: 'info', title: '30 days to the exam window', detail: '', read: false, createdAt: '2026-07-18' },
      },
      resourceProgress: {
        'res-1': {
          progressPercent: 65,
          understandingPercent: 40,
          note: 'Need to ask why this estimator is unbiased.',
          updatedAt: '2026-07-16T12:00:00.000Z',
        },
      },
      uploadedResources: [{ id: 'up-1', name: 'notes.pdf', uploadedAt: '2026-07-16T08:00:00.000Z', size: 1024 }],
      recentResourceIds: ['res-1'],
      snapshots: { '2026-07-16': { done: 2, hours: 3.25 } },
      dayLogs: { '2026-07-16': { 'block:breakfast': 'done', 'block:study-am': 'skipped' } },
      focusRewards: { points: 120, level: 2, trees: 3, streak: 1, guard: 'gentle' },
      settings: {
        referenceDate: '2026-07-16',
        campaignStart: '2026-07-16',
        campaignEnd: '2026-08-16',
        examWindowStart: '2026-08-17',
        moduleExamDates: {},
        mat700Active: true,
        theme: 'light',
      },
      createdAt: '2026-07-16T00:00:00.000Z',
      updatedAt: '2026-07-16T11:05:00.000Z',
    },
  }
}

// --- Gate 1: import authoritative JSON into a fresh database ---------------

test('gate 1: current authoritative JSON imports into a fresh SQLite database', async () => {
  await withDb((db) => {
    db.seedCatalog(CATALOG)
    db.projectState(representativeState())
    const counts = db.counts()
    assert.ok(counts.cards >= 2, 'catalogue and custom cards are present')
    const exported = db.exportState()
    assert.equal(exported.cards['card-001'].done, true)
  })
})

// --- Gate 2: export back to the canonical application-state shape ----------

test('gate 2: the projection exports back into the application-state shape', async () => {
  await withDb((db) => {
    db.seedCatalog(CATALOG)
    db.projectState(representativeState())
    const exported = db.exportState()

    for (const key of ['cards', 'addedCards', 'moduleNotes', 'notifications', 'resourceProgress', 'settings']) {
      assert.ok(key in exported, `${key} is exported`)
    }
  })
})

// --- Gate 3: semantic parity ----------------------------------------------

test('gate 3 (passing half): the domains the schema models do survive a round trip', async () => {
  await withDb((db) => {
    db.seedCatalog(CATALOG)
    const original = representativeState()
    db.projectState(original)
    const exported = db.exportState()
    const source = original.state

    // Card count and the exact two completed records.
    const doneIds = Object.entries(exported.cards)
      .filter(([, card]) => card.done)
      .map(([id]) => id)
      .concat(exported.addedCards.filter((card) => card.status === 'Done').map((card) => card.id))
    assert.deepEqual(doneIds.sort(), ['card-001', 'custom-1'], 'both completed records survive')

    // Status, done, hours.
    assert.equal(exported.cards['card-001'].status, 'Done')
    assert.equal(exported.cards['card-001'].actualHours, 3.25)
    assert.equal(exported.cards['card-001'].progressPercent, 100)

    // Checklist state.
    assert.deepEqual(exported.cards['card-001'].checklist, source.cards['card-001'].checklist)

    // Notes and evidence text.
    assert.equal(exported.cards['card-001'].notes[0].text, 'Derivation was the hard part')
    assert.equal(exported.cards['card-001'].evidenceEntries[0].text, 'Worked solutions photo')

    // Resource links.
    assert.deepEqual(exported.cards['card-001'].resourceIds, ['res-1'])
    assert.deepEqual(exported.resourceProgress, source.resourceProgress)

    // Module notes, notifications, settings, focus rewards.
    assert.deepEqual(exported.moduleNotes, source.moduleNotes)
    assert.equal(exported.notifications['exam:t-30'].title, '30 days to the exam window')
    assert.deepEqual(exported.settings.moduleExamDates, {})
    assert.equal(exported.settings.campaignStart, '2026-07-16')
    assert.deepEqual(exported.focusRewards, source.focusRewards)
  })
})

test('gate 3 FAILS: campaign-critical domains are lost in a round trip', async () => {
  await withDb((db) => {
    db.seedCatalog(CATALOG)
    const original = representativeState()
    db.projectState(original)
    const exported = db.exportState()
    const card = exported.cards['card-001']

    // Each assertion below documents a real, reproducible loss. They are written
    // as "this is still lost" rather than "this works", so that fixing the schema
    // fails the test and forces this file and the exclusion list to be updated
    // together. Do NOT delete an assertion to make the suite green.
    assert.equal(exported.dayLogs, undefined, 'day logs are lost — Schedule Done/Skipped would not survive')
    assert.equal(exported.snapshots, undefined, 'daily snapshots are lost')
    assert.equal(exported.uploadedResources, undefined, 'uploaded resource metadata is lost')
    assert.equal(exported.recentResourceIds, undefined, 'recent resource ordering is lost')
    assert.equal(card.focusSessions, undefined, 'per-card focus session history is lost')
    assert.equal(card.activity, undefined, 'card activity trail is lost')
    assert.equal(card.userTags, undefined, 'user tags are lost')
    assert.equal(card.evidenceEntries[0].url, undefined, 'evidence attachment url is lost')
    assert.equal(card.evidenceEntries[0].fileName, undefined, 'evidence attachment fileName is lost')
  })
})

test('the exclusion list matches what the round trip actually loses', () => {
  const domains = SQLITE_PARITY_EXCLUSIONS.map((entry) => entry.domain).sort()
  assert.deepEqual(domains, [
    'activity',
    'card edits',
    'dayLogs',
    'evidence attachments',
    'focusSessions',
    'hiddenResourceIds',
    'recentResourceIds',
    'snapshots',
    'uploadedResources',
    'userTags',
  ])
  for (const entry of SQLITE_PARITY_EXCLUSIONS) {
    assert.ok(entry.detail, `${entry.domain} explains itself`)
    assert.equal(typeof entry.blocksAuthority, 'boolean')
  }
  assert.ok(
    SQLITE_PARITY_EXCLUSIONS.filter((entry) => entry.blocksAuthority).length >= 5,
    'the authority blockers are recorded, not softened',
  )
})

// --- Gate 4: deterministic repeated import/export --------------------------

test('gate 4: repeated import/export is deterministic', async () => {
  await withDb((db) => {
    db.seedCatalog(CATALOG)
    const original = representativeState()

    db.projectState(original)
    const first = db.exportState()

    // Projecting the same state again must not drift or duplicate rows.
    db.projectState(original)
    const second = db.exportState()

    assert.deepEqual(second, first, 'a repeated projection produces an identical export')
    assert.equal(second.cards['card-001'].notes.length, 1, 'notes are not duplicated')
    assert.equal(second.cards['card-001'].evidenceEntries.length, 1, 'evidence is not duplicated')
    assert.deepEqual(second.cards['card-001'].resourceIds, ['res-1'], 'resource links are not duplicated')
  })
})

test('gate 4: a re-projection is a clean replace, not an accumulate', async () => {
  await withDb((db) => {
    db.seedCatalog(CATALOG)
    const original = representativeState()
    db.projectState(original)

    // Unlink a resource and drop a note, then re-project.
    const edited = representativeState()
    edited.state.cards['card-001'].resourceIds = []
    edited.state.cards['card-001'].notes = []
    db.projectState(edited)

    const exported = db.exportState()
    assert.equal(exported.cards['card-001'].resourceIds, undefined, 'the unlinked resource is gone')
    assert.equal(exported.cards['card-001'].notes, undefined, 'the removed note is gone')
  })
})

// --- The verdict ----------------------------------------------------------

test('the authority gates do not currently pass, so JSON stays authoritative', () => {
  const blockers = SQLITE_PARITY_EXCLUSIONS.filter((entry) => entry.blocksAuthority)
  // The brief's acceptance criteria require that focus rewards and day logs
  // survive an authority switch. Day logs and focus sessions have no table at
  // all, so the switch cannot be attempted regardless of how the rest behaves.
  assert.ok(blockers.some((entry) => entry.domain === 'dayLogs'))
  assert.ok(blockers.some((entry) => entry.domain === 'focusSessions'))
  assert.ok(blockers.length > 0, 'authority must not move while any blocker stands')
})
