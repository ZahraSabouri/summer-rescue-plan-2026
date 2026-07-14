import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCatchUp, daysLate } from '../src/utils/insights.js'

const REF = '2026-07-14'

function card(overrides) {
  return {
    number: 1,
    title: 'Task',
    module: 'Applied Machine Learning',
    moduleGroup: 'Applied ML',
    status: 'This Week',
    priority: 'High',
    done: false,
    estimatedHours: 2,
    ...overrides,
  }
}

test('daysLate measures whole days past the due date', () => {
  assert.equal(daysLate(card({ dueDate: '2026-07-13' }), REF), 1)
  assert.equal(daysLate(card({ dueDate: '2026-07-07' }), REF), 7)
  assert.equal(daysLate(card({ dueDate: '2026-07-14' }), REF), 0)
  assert.equal(daysLate(card({ dueDate: '2026-07-20' }), REF), 0) // future clamps to 0
})

test('buildCatchUp collects only overdue, unfinished, actionable cards', () => {
  const cards = [
    card({ id: 'a', dueDate: '2026-07-13' }), // yesterday
    card({ id: 'b', dueDate: '2026-07-14' }), // due today — not behind
    card({ id: 'c', dueDate: '2026-07-10', done: true }), // done — excluded
    card({ id: 'd', dueDate: '2026-07-01', status: 'Waiting / Blocked' }), // blocked — excluded
    card({ id: 'e', dueDate: '2026-07-05', moduleGroup: 'Time Series', module: 'Time Series' }),
  ]
  const result = buildCatchUp(cards, REF)
  const ids = result.groups.flatMap((group) => group.items.map((item) => item.card.id))
  assert.deepEqual(ids.sort(), ['a', 'e'])
  assert.equal(result.total, 2)
  assert.equal(result.moduleCount, 2)
})

test('buildCatchUp groups by module, orders oldest-first, and buckets by age', () => {
  const cards = [
    card({ id: 'new', dueDate: '2026-07-13' }), // 1 day (yesterday)
    card({ id: 'mid', dueDate: '2026-07-10' }), // 4 days (this week)
    card({ id: 'old', dueDate: '2026-06-20' }), // >7 days (older)
  ]
  const result = buildCatchUp(cards, REF)
  assert.equal(result.groups.length, 1)
  const group = result.groups[0]
  assert.equal(group.group, 'Applied ML')
  assert.deepEqual(group.items.map((item) => item.card.id), ['old', 'mid', 'new'])
  assert.equal(group.maxDaysLate, daysLate(card({ dueDate: '2026-06-20' }), REF))
  assert.deepEqual(result.buckets, { yesterday: 1, week: 1, older: 1 })
  assert.ok(result.behindModules.has('Applied ML'))
})

test('buildCatchUp honours the MAT700 toggle', () => {
  const cards = [
    card({ id: 'm', dueDate: '2026-07-10', moduleGroup: 'MAT700', module: 'Data Mining' }),
    card({ id: 'a', dueDate: '2026-07-10' }),
  ]
  assert.equal(buildCatchUp(cards, REF, true).total, 2)
  assert.equal(buildCatchUp(cards, REF, false).total, 1)
})
