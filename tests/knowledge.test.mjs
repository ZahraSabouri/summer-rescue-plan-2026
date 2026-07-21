import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { openTrackerDb } from '../src/server/trackerDb.js'
import { createInitialTrackerState, migrateTrackerState } from '../src/state/trackerStateMigration.js'
import {
  emptyKnowledge,
  groupNotesByTopic,
  knowledgeSummary,
  normaliseKnowledge,
  notesForCard,
  parseNoteBundle,
  relatedNotesForCard,
  resolveModuleNotes,
  reviewStatus,
  searchNotes,
} from '../src/utils/knowledge.js'

const TODAY = '2026-07-19'

const SEEDS = [
  {
    id: 'kn-aml-types',
    moduleId: 'aml',
    title: 'ML types',
    kind: 'concept',
    topic: 'Foundations',
    tags: ['taxonomy'],
    body: '# Types\n\nSupervised and unsupervised.',
  },
  {
    id: 'kn-aml-traps',
    moduleId: 'aml',
    title: 'Traps',
    kind: 'traps',
    topic: 'Foundations',
    body: 'Logistic regression is classification.',
  },
  {
    id: 'kn-mat700-axes',
    moduleId: 'mat700',
    title: 'Four axes',
    kind: 'cheatsheet',
    topic: 'Foundations',
    body: 'Supervision, generalisation, arrival, level.',
  },
]

function resolve(knowledge, moduleId = 'aml', referenceDate = TODAY) {
  return resolveModuleNotes({ seeds: SEEDS, knowledge, moduleId, referenceDate })
}

test('seeds resolve per module and ignore other modules', () => {
  const aml = resolve(emptyKnowledge())
  assert.deepEqual(
    aml.map((note) => note.id).sort(),
    ['kn-aml-traps', 'kn-aml-types'],
  )
  assert.equal(resolve(emptyKnowledge(), 'mat700').length, 1)
})

test('a user note under a seed id takes over from the seed', () => {
  const knowledge = normaliseKnowledge({
    notes: {
      'kn-aml-types': {
        id: 'kn-aml-types',
        moduleId: 'aml',
        title: 'ML types (mine)',
        kind: 'concept',
        topic: 'Foundations',
        body: 'Rewritten.',
      },
    },
    meta: {},
  })
  const note = resolve(knowledge).find((entry) => entry.id === 'kn-aml-types')
  assert.equal(note.title, 'ML types (mine)')
  assert.equal(note.body, 'Rewritten.')
  assert.equal(note.seeded, false)
})

test('hidden notes drop out of the resolved list', () => {
  const knowledge = normaliseKnowledge({ notes: {}, meta: { 'kn-aml-traps': { hidden: true } } })
  assert.deepEqual(
    resolve(knowledge).map((note) => note.id),
    ['kn-aml-types'],
  )
})

test('an unreviewed note is new, and review state moves with the ladder', () => {
  assert.equal(reviewStatus({}, TODAY).state, 'new')

  // First review, rated ok: the ladder starts at one day, so it is due today.
  const justReviewed = { lastReviewedAt: '2026-07-18T10:00:00.000Z', reviewCount: 1, confidence: 'ok' }
  assert.equal(reviewStatus(justReviewed, TODAY).state, 'due')

  // Rated solid at the same count, the interval steps up and it is not due.
  const solid = { ...justReviewed, confidence: 'solid' }
  assert.equal(reviewStatus(solid, TODAY).state, 'scheduled')

  // Rated shaky, it always returns to the bottom of the ladder.
  const shaky = { lastReviewedAt: '2026-07-18T10:00:00.000Z', reviewCount: 6, confidence: 'shaky' }
  assert.equal(reviewStatus(shaky, TODAY).state, 'due')
})

test('an overdue review reports how many days late', () => {
  const status = reviewStatus(
    { lastReviewedAt: '2026-07-10T10:00:00.000Z', reviewCount: 1, confidence: 'ok' },
    TODAY,
  )
  assert.equal(status.state, 'due')
  assert.match(status.label, /8d overdue/)
})

test('summary counts due, unread and starred notes', () => {
  const knowledge = normaliseKnowledge({
    notes: {},
    meta: {
      'kn-aml-types': { starred: true, lastReviewedAt: '2026-07-01T10:00:00.000Z', reviewCount: 1, confidence: 'ok' },
    },
  })
  const summary = knowledgeSummary(resolve(knowledge))
  assert.equal(summary.total, 2)
  assert.equal(summary.due, 1)
  assert.equal(summary.unread, 1)
  assert.equal(summary.starred, 1)
})

test('quiz ratings are kept only for known values', () => {
  const knowledge = normaliseKnowledge({
    notes: {},
    meta: { 'kn-aml-types': { quiz: { 0: 'know', 1: 'unsure', 2: 'nonsense' } } },
  })
  assert.deepEqual(knowledge.meta['kn-aml-types'].quiz, { 0: 'know', 1: 'unsure' })
})

test('notes can be found by search and grouped by topic', () => {
  const notes = resolve(emptyKnowledge())
  assert.equal(searchNotes(notes, 'logistic').length, 1)
  assert.equal(searchNotes(notes, 'taxonomy').length, 1)
  assert.equal(searchNotes(notes, '').length, 2)
  const grouped = groupNotesByTopic(notes)
  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].topic, 'Foundations')
})

test('notesForCard filters by linked card id', () => {
  const knowledge = normaliseKnowledge({
    notes: {
      'kn-aml-types': { id: 'kn-aml-types', moduleId: 'aml', title: 'ML types', body: 'x', cardIds: ['card-7'] },
    },
    meta: {},
  })
  const notes = resolve(knowledge)
  assert.deepEqual(
    notesForCard(notes, 'card-7').map((note) => note.id),
    ['kn-aml-types'],
  )
  assert.equal(notesForCard(notes, 'card-8').length, 0)
  assert.equal(notesForCard(notes, '').length, 0)
})

test('relatedNotesForCard joins notes to a card by session/lecture/pack key', () => {
  const notes = resolve(
    normaliseKnowledge({
      notes: {
        's2-why': { id: 's2-why', moduleId: 'aml', title: 'Why preprocessing', topic: 'S2 · Foundations', body: 'x' },
        's2-encode': { id: 's2-encode', moduleId: 'aml', title: 'Encoding', topic: 'S2 · Inspection', body: 'x' },
        's3-bias': { id: 's3-bias', moduleId: 'aml', title: 'Bias/variance', topic: 'S3 · Models', body: 'x' },
        'kn-explicit': { id: 'kn-explicit', moduleId: 'aml', title: 'Pinned', topic: 'Foundations', body: 'x', cardIds: ['card-s2'] },
      },
      meta: {},
    }),
  )

  // An S2 card pulls in every S2 note plus its explicitly pinned note, but not S3.
  const s2Card = { id: 'card-s2', title: 'AML S2 — Run Lab 2 + preprocessing inventory' }
  const s2Ids = relatedNotesForCard(notes, s2Card).map((note) => note.id).sort()
  assert.deepEqual(s2Ids, ['kn-explicit', 's2-encode', 's2-why'])

  // A card with no session key in its title falls back to explicit links only.
  const metaCard = { id: 'card-s2', title: 'AML — Open-book master index (start)' }
  assert.deepEqual(
    relatedNotesForCard(notes, metaCard).map((note) => note.id),
    ['kn-explicit'],
  )

  // A consolidation card spanning S1–S5 reaches every session in the range.
  const consolidation = { id: 'card-030', title: 'AML — 5 session summary sheets (consolidate S1–S5)' }
  const spanIds = relatedNotesForCard(notes, consolidation).map((note) => note.id).sort()
  assert.deepEqual(spanIds, ['s2-encode', 's2-why', 's3-bias'])
})

test('parseNoteBundle splits a multi-note file and reads its metadata', () => {
  const bundle = [
    '@@ id=s1-a | title=First note | kind=concept | topic=S1 · Foundations | key | tags=one,two | cards=card-001',
    'Body of the first note.',
    '',
    '## Check yourself',
    '1. Question? :: Answer.',
    '',
    '@@ id=s1-b | title=Second note | kind=traps | topic=S1 · Debugging',
    'Body of the second note.',
    '',
    '```python',
    '@@ decorator_like = "this is inside a fence and must not split the note"',
    '```',
  ].join('\n')

  const notes = parseNoteBundle(bundle, { moduleId: 'aml' })
  assert.equal(notes.length, 2)
  // The fenced `@@` line stays in the second note's body rather than opening a third.
  assert.ok(notes[1].body.includes('decorator_like'))
  assert.equal(notes[0].id, 's1-a')
  assert.equal(notes[0].moduleId, 'aml')
  assert.equal(notes[0].priority, 'high')
  assert.deepEqual(notes[0].tags, ['one', 'two'])
  assert.deepEqual(notes[0].cardIds, ['card-001'])
  assert.ok(notes[0].body.includes('Check yourself'))
  assert.equal(notes[1].priority, 'normal')
  assert.equal(notes[1].kind, 'traps')
  assert.deepEqual(notes[1].cardIds, [])
})

test('parseNoteBundle ignores a bundle with no note headers', () => {
  assert.deepEqual(parseNoteBundle('just some text\nwith no headers'), [])
  assert.deepEqual(parseNoteBundle(''), [])
})

test('the seeded key notes resolve with priority preserved', () => {
  const seeds = parseNoteBundle('@@ id=s1-x | title=Key one | key\nBody.', { moduleId: 'aml' })
  const resolved = resolveModuleNotes({ seeds, knowledge: emptyKnowledge(), moduleId: 'aml', referenceDate: TODAY })
  assert.equal(resolved[0].priority, 'high')
  assert.equal(resolved[0].meta.starred, false)
})

test('a fresh tracker state carries an empty knowledge store', () => {
  const state = createInitialTrackerState(TODAY)
  assert.deepEqual(state.knowledge, { notes: {}, meta: {} })
})

test('migrating a state written before knowledge existed does not throw', () => {
  const legacy = { ...createInitialTrackerState(TODAY) }
  delete legacy.knowledge
  const migrated = migrateTrackerState(legacy)
  assert.deepEqual(migrated.knowledge, { notes: {}, meta: {} })
})

test('knowledge survives a SQLite projection round trip', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'summer-rescue-knowledge-'))
  const db = openTrackerDb(path.join(dir, 'app.sqlite'))
  try {
    const state = {
      ...createInitialTrackerState(TODAY),
      knowledge: {
        notes: {
          'kn-aml-mine': {
            id: 'kn-aml-mine',
            moduleId: 'aml',
            title: 'My note',
            kind: 'cheatsheet',
            topic: 'Foundations',
            body: '# Heading\n\n| a | b |\n| --- | --- |\n| 1 | 2 |',
            priority: 'high',
            tags: ['recall', 'exam'],
            cardIds: ['card-7'],
            createdAt: '2026-07-19T00:00:00.000Z',
            updatedAt: '2026-07-19T00:00:00.000Z',
            seeded: false,
          },
        },
        meta: {
          'kn-aml-mine': {
            starred: true,
            hidden: false,
            lastReviewedAt: '2026-07-18T10:00:00.000Z',
            reviewCount: 3,
            confidence: 'solid',
            quiz: { 0: 'know', 1: 'unsure' },
          },
        },
      },
    }

    db.projectState(state)
    const exported = db.exportState()
    assert.deepEqual(exported.knowledge.notes['kn-aml-mine'], state.knowledge.notes['kn-aml-mine'])
    assert.deepEqual(exported.knowledge.meta['kn-aml-mine'], state.knowledge.meta['kn-aml-mine'])

    // A re-projection replaces rather than accumulates.
    db.projectState({ ...state, knowledge: emptyKnowledge() })
    assert.deepEqual(db.exportState().knowledge, { notes: {}, meta: {} })
  } finally {
    db.close()
    await fs.rm(dir, { recursive: true, force: true })
  }
})
