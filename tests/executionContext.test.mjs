import assert from 'node:assert/strict'
import test from 'node:test'

import { buildExecutionContext } from '../src/utils/schedule.js'

const cards = [
  { id: 'study-1', moduleGroup: 'Applied ML', status: 'This Week', done: false, dueDate: '2026-07-13', priority: 'Critical', sortOrder: 1 },
  { id: 'study-2', moduleGroup: 'Time Series', status: 'This Week', done: false, dueDate: '2026-07-13', priority: 'High', sortOrder: 2 },
]

const blocks = [
  { id: 'breakfast', date: '2026-07-13', start: '08:00', end: '08:30', title: 'Breakfast', category: 'meal' },
  { id: 'aml', date: '2026-07-13', start: '09:00', end: '11:00', title: 'Applied ML', category: 'study', moduleGroup: 'Applied ML' },
  { id: 'lunch', date: '2026-07-13', start: '12:00', end: '12:30', title: 'Lunch', category: 'meal' },
  { id: 'ts', date: '2026-07-13', start: '13:00', end: '15:00', title: 'Time Series', category: 'study', moduleGroup: 'Time Series' },
]

test('execution context uses the current boundary and nearest linked output', () => {
  const context = buildExecutionContext(blocks, cards, '2026-07-13', {
    today: '2026-07-13',
    nowMinutes: 8 * 60 + 10,
  })

  assert.equal(context.mode, 'current')
  assert.equal(context.block.id, 'breakfast')
  assert.equal(context.card.id, 'study-1')
  assert.equal(context.cardBlock.id, 'aml')
  assert.equal(context.nextBlock.id, 'aml')
})

test('future-day preview starts at the first real block', () => {
  const context = buildExecutionContext(blocks, cards, '2026-07-13', {
    today: '2026-07-12',
    nowMinutes: 22 * 60,
  })

  assert.equal(context.mode, 'future')
  assert.equal(context.block.id, 'breakfast')
  assert.equal(context.card.id, 'study-1')
})

test('an active timer card locks the execution output without changing the timetable boundary', () => {
  const context = buildExecutionContext(blocks, cards, '2026-07-13', {
    today: '2026-07-13',
    nowMinutes: 9 * 60 + 30,
    activeCard: cards[1],
  })

  assert.equal(context.block.id, 'aml')
  assert.equal(context.card.id, 'study-2')
  assert.equal(context.cardBlock.id, 'ts')
  assert.equal(context.lockedToTimer, true)
})

test('execution context reports completion after the final block', () => {
  const context = buildExecutionContext(blocks, cards, '2026-07-13', {
    today: '2026-07-13',
    nowMinutes: 20 * 60,
  })

  assert.equal(context.mode, 'complete')
  assert.equal(context.block, null)
  assert.equal(context.card, null)
})
