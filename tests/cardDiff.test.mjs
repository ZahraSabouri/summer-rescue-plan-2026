import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detailChanges } from '../src/utils/cardDiff.js'

const CARD = {
  id: 'card-1',
  title: 'Revise CLT',
  module: 'Time Series',
  moduleGroup: 'Time Series',
  phase: 'Phase 0',
  priority: 'Medium',
  slotLabel: 'Morning',
  dueDate: '2026-08-01',
  startDate: '2026-07-20',
  estimatedHours: 2,
  tags: ['exam', 'theory'],
}

test('an unchanged save produces no changes, so no event is emitted', () => {
  // The detail form always submits every field; re-saving without editing must
  // not write a change record.
  assert.deepEqual(detailChanges(CARD, { ...CARD }), {})
})

test('only the moved fields are reported', () => {
  const changes = detailChanges(CARD, { ...CARD, priority: 'High', phase: 'Phase 1' })
  assert.deepEqual(Object.keys(changes).sort(), ['phase', 'priority'])
  assert.deepEqual(changes.priority, { from: 'Medium', to: 'High' })
  assert.deepEqual(changes.phase, { from: 'Phase 0', to: 'Phase 1' })
})

test('`to` carries the absolute value so replay is idempotent', () => {
  const changes = detailChanges(CARD, { estimatedHours: 5 })
  assert.equal(changes.estimatedHours.to, 5)
})

test('identical tag arrays are not reported as a change', () => {
  assert.deepEqual(detailChanges(CARD, { tags: ['exam', 'theory'] }), {})
})

test('tag edits are detected by contents and by order', () => {
  assert.deepEqual(detailChanges(CARD, { tags: ['exam'] }).tags, {
    from: ['exam', 'theory'],
    to: ['exam'],
  })
  assert.ok(detailChanges(CARD, { tags: ['theory', 'exam'] }).tags, 'reordering counts as a change')
  assert.ok(detailChanges(CARD, { tags: ['exam', 'theory', 'new'] }).tags)
})

test('clearing a field records the literal cleared value, not null', () => {
  // The card's dueDate really does become '', and replay must write '' back.
  // Normalising it to null here would make the event describe a state the card
  // was never in.
  const changes = detailChanges(CARD, { dueDate: '' })
  assert.deepEqual(changes.dueDate, { from: '2026-08-01', to: '' })
})

test('an undefined target is normalised to null so the payload stays serialisable', () => {
  // JSON.stringify drops undefined values, which would silently erase the field
  // from the event on its way to the log.
  const changes = detailChanges(CARD, { slotLabel: undefined })
  assert.deepEqual(changes.slotLabel, { from: 'Morning', to: null })
  assert.ok('slotLabel' in JSON.parse(JSON.stringify(changes)))
})

test('a field absent from the card is reported as a new value', () => {
  const changes = detailChanges({ id: 'card-2' }, { priority: 'High' })
  assert.deepEqual(changes.priority, { from: null, to: 'High' })
})

test('a partial patch never invents changes for untouched fields', () => {
  const changes = detailChanges(CARD, { priority: 'High' })
  assert.deepEqual(Object.keys(changes), ['priority'])
})

test('a missing card or patch yields nothing rather than throwing', () => {
  assert.deepEqual(detailChanges(null, { priority: 'High' }), {})
  assert.deepEqual(detailChanges(CARD), {})
  assert.deepEqual(detailChanges(CARD, null), {})
})

test('numeric and string forms of a value are treated as different', () => {
  // estimatedHours arrives from a form as a string; the diff must not silently
  // coerce, or a real 2 -> "2" write would go unrecorded.
  assert.ok(detailChanges(CARD, { estimatedHours: '2' }).estimatedHours)
})
