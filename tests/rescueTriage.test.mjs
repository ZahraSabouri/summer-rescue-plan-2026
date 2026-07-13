import assert from 'node:assert/strict'
import test from 'node:test'

import { getRescueTriageCards, isValidTriageDate } from '../src/utils/rescueTriage.js'

const cards = [
  { id: 'later', dueDate: '2026-07-11', sortOrder: 4, done: false },
  { id: 'earlier', dueDate: '2026-07-09', sortOrder: 2, done: false },
  { id: 'today', dueDate: '2026-07-12', sortOrder: 1, done: false },
  { id: 'done', dueDate: '2026-07-08', sortOrder: 1, done: true },
  { id: 'undated', dueDate: '', sortOrder: 1, done: false },
  { id: 'rescue', dueDate: '2026-07-08', status: 'Rescue Lane', sortOrder: 1, done: false },
  { id: 'waiting', dueDate: '2026-07-08', status: 'Waiting / Blocked', sortOrder: 1, done: false },
]

test('triage includes only open cards whose due date is before the reference date', () => {
  assert.deepEqual(
    getRescueTriageCards(cards, '2026-07-12').map((card) => card.id),
    ['earlier', 'later'],
  )
})

test('an explicit Rescue Lane or Waiting decision removes a card from triage', () => {
  assert.deepEqual(
    getRescueTriageCards(cards, '2026-07-12').map((card) => card.id),
    ['earlier', 'later'],
  )
})

test('triage de-duplicates cards without changing chronological priority', () => {
  assert.deepEqual(
    getRescueTriageCards([cards[0], cards[1], { ...cards[1] }], '2026-07-12').map((card) => card.id),
    ['earlier', 'later'],
  )
})

test('deferral requires an explicit real date that is not before the reference date', () => {
  assert.equal(isValidTriageDate('', '2026-07-12'), false)
  assert.equal(isValidTriageDate('2026-07-11', '2026-07-12'), false)
  assert.equal(isValidTriageDate('2026-02-30', '2026-07-12'), false)
  assert.equal(isValidTriageDate('2026-07-12', '2026-07-12'), true)
  assert.equal(isValidTriageDate('2026-07-20', '2026-07-12'), true)
})
