import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createEntryId,
  emptyGeneralKnowledge,
  generalKnowledgeSummary,
  groupEntriesByDate,
  knownTags,
  listGeneralKnowledgeEntries,
  moduleForTag,
  normaliseGeneralKnowledge,
  normaliseGeneralKnowledgeEntry,
  searchEntries,
} from '../src/utils/generalKnowledge.js'
import { todayString } from '../src/utils/progress.js'

const TODAY = '2026-07-22'

const MODULES = [
  { id: 'aml', code: 'CMT307', title: 'Applied Machine Learning' },
  { id: 'mat700', code: 'MAT700', title: 'Mathematical Methods for Data Mining' },
]

test('normaliseGeneralKnowledgeEntry requires an id and non-empty text', () => {
  assert.equal(normaliseGeneralKnowledgeEntry(null), null)
  assert.equal(normaliseGeneralKnowledgeEntry({ id: 'gk-1', text: '   ' }), null)
  assert.equal(normaliseGeneralKnowledgeEntry({ text: 'no id' }), null)
  const clean = normaliseGeneralKnowledgeEntry({ id: 'gk-1', text: 'Salmon is a fish.' })
  assert.equal(clean.id, 'gk-1')
  assert.equal(clean.text, 'Salmon is a fish.')
  assert.equal(clean.date, todayString())
  assert.deepEqual(clean.tags, [])
  assert.equal(clean.starred, false)
})

test('normaliseGeneralKnowledgeEntry keeps a valid date and rejects a malformed one', () => {
  const withDate = normaliseGeneralKnowledgeEntry({ id: 'gk-1', text: 'x', date: '2026-07-01' })
  assert.equal(withDate.date, '2026-07-01')
  const malformed = normaliseGeneralKnowledgeEntry({ id: 'gk-1', text: 'x', date: 'not-a-date', createdAt: '2026-07-05T00:00:00.000Z' })
  assert.equal(malformed.date, '2026-07-05')
})

test('normaliseGeneralKnowledgeEntry trims and dedupes-free tags', () => {
  const clean = normaliseGeneralKnowledgeEntry({ id: 'gk-1', text: 'x', tags: [' Applied Machine Learning ', '', 'Session 1'] })
  assert.deepEqual(clean.tags, ['Applied Machine Learning', 'Session 1'])
})

test('normaliseGeneralKnowledge normalises a map of entries and drops invalid ones', () => {
  const knowledge = normaliseGeneralKnowledge({
    entries: {
      'gk-1': { text: 'Keep this one' },
      'gk-2': { id: 'gk-2', text: '' },
      bad: null,
    },
  })
  assert.deepEqual(Object.keys(knowledge.entries), ['gk-1'])
  assert.equal(knowledge.entries['gk-1'].text, 'Keep this one')
})

test('emptyGeneralKnowledge and listGeneralKnowledgeEntries round-trip', () => {
  assert.deepEqual(emptyGeneralKnowledge(), { entries: {} })
  const list = listGeneralKnowledgeEntries({
    entries: { a: { id: 'a', text: 'one' }, b: { id: 'b', text: 'two' } },
  })
  assert.equal(list.length, 2)
})

test('createEntryId slugs the entry text (truncated) and stays unique enough to key a map', () => {
  const id = createEntryId('I figured out that appeals close in Feb 2027')
  assert.match(id, /^gk-i-figured-out-that-appea-/)
})

test('searchEntries matches on text and tags, case-insensitively', () => {
  const entries = [
    { text: 'Salmon is a fish', tags: ['Biology'] },
    { text: 'Appeals close before Feb 2027', tags: ['Extenuating Circumstances'] },
  ]
  assert.equal(searchEntries(entries, 'salmon').length, 1)
  assert.equal(searchEntries(entries, 'EXTENUATING').length, 1)
  assert.equal(searchEntries(entries, '').length, 2)
  assert.equal(searchEntries(entries, 'nope').length, 0)
})

test('groupEntriesByDate groups newest-first and labels today/yesterday', () => {
  const grouped = groupEntriesByDate(
    [
      { id: '1', date: TODAY, createdAt: '2026-07-22T09:00:00.000Z', text: 'today entry' },
      { id: '2', date: '2026-07-21', createdAt: '2026-07-21T09:00:00.000Z', text: 'yesterday entry' },
      { id: '3', date: '2026-07-01', createdAt: '2026-07-01T09:00:00.000Z', text: 'old entry' },
    ],
    TODAY,
  )
  assert.deepEqual(
    grouped.map((group) => group.label),
    ['Today', 'Yesterday', formatOld()],
  )

  function formatOld() {
    // Mirrors utils/progress.js formatDate output for 2026-07-01 (a Wednesday).
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(
      new Date(2026, 6, 1),
    )
  }
})

test('groupEntriesByDate orders multiple same-day entries newest-created first', () => {
  const grouped = groupEntriesByDate([
    { id: '1', date: TODAY, createdAt: '2026-07-22T08:00:00.000Z', text: 'first' },
    { id: '2', date: TODAY, createdAt: '2026-07-22T12:00:00.000Z', text: 'second' },
  ])
  assert.deepEqual(grouped[0].items.map((entry) => entry.id), ['2', '1'])
})

test('moduleForTag matches title, code, or id case-insensitively and returns null otherwise', () => {
  assert.equal(moduleForTag('applied machine learning', MODULES).id, 'aml')
  assert.equal(moduleForTag('CMT307', MODULES).id, 'aml')
  assert.equal(moduleForTag('mat700', MODULES).id, 'mat700')
  assert.equal(moduleForTag('Extenuating Circumstances', MODULES), null)
  assert.equal(moduleForTag('', MODULES), null)
})

test('knownTags offers module titles plus every tag already used, sorted and deduped', () => {
  const entries = [
    { tags: ['Session 1', 'Applied Machine Learning'] },
    { tags: ['Session 1'] },
  ]
  const tags = knownTags(entries, MODULES)
  assert.deepEqual(tags, [
    'Applied Machine Learning',
    'Mathematical Methods for Data Mining',
    'Session 1',
  ])
})

test('generalKnowledgeSummary counts total and starred', () => {
  const summary = generalKnowledgeSummary([
    { starred: true },
    { starred: false },
    { starred: true },
  ])
  assert.deepEqual(summary, { total: 3, starred: 2 })
})
