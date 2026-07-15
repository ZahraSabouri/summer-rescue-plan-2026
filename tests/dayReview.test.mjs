import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blockLogKey, buildDayReview } from '../src/utils/dayReview.js'

const DAY = '2026-07-13'

const BLOCKS = [
  { id: 'study-am', start: '09:00', end: '12:00', title: 'AML deep work', category: 'study' },
  { id: 'wake', start: '07:00', end: '08:00', title: 'Wake + wash-up', category: 'routine' },
  { id: 'lunch', start: '12:30', end: '13:30', title: 'Lunch', category: 'routine' },
]

function doneCard(id, atDay) {
  return {
    id,
    number: 1,
    title: `Card ${id}`,
    done: true,
    activity: [{ id: 'a1', at: `${atDay}T18:00:00.000Z`, action: 'Marked done', details: '' }],
    focusSessions: [],
  }
}

test('blockLogKey combines id and start so repeated rule ids stay distinct', () => {
  assert.equal(blockLogKey({ id: 'meal', start: '08:00' }), 'meal@08:00')
  assert.notEqual(blockLogKey({ id: 'meal', start: '08:00' }), blockLogKey({ id: 'meal', start: '19:00' }))
})

test('buildDayReview sorts blocks by start and maps log statuses', () => {
  const log = {
    days: {
      [DAY]: { blocks: { 'wake@07:00': 'done', 'study-am@09:00': 'skipped', 'lunch@12:30': 'bogus' }, note: 'rough day' },
    },
  }
  const review = buildDayReview({ date: DAY, blocks: BLOCKS, cards: [], log })
  assert.deepEqual(review.entries.map((entry) => entry.block.id), ['wake', 'study-am', 'lunch'])
  assert.deepEqual(review.entries.map((entry) => entry.status), ['done', 'skipped', 'unlogged'])
  assert.equal(review.note, 'rough day')
  assert.deepEqual(review.summary, { total: 3, done: 1, skipped: 1, unlogged: 1, loggedPct: 67 })
})

test('buildDayReview reports cards completed and focus minutes for that day only', () => {
  const cards = [
    doneCard('right-day', DAY),
    doneCard('other-day', '2026-07-10'),
    {
      id: 'focus-card',
      number: 2,
      title: 'Focus card',
      done: false,
      activity: [],
      focusSessions: [
        { at: `${DAY}T10:00:00.000Z`, minutes: 25 },
        { at: `${DAY}T15:00:00.000Z`, minutes: 50 },
        { at: '2026-07-12T10:00:00.000Z', minutes: 25 },
      ],
    },
  ]
  const review = buildDayReview({ date: DAY, blocks: BLOCKS, cards, log: { days: {} } })
  assert.deepEqual(review.cardsDone.map((card) => card.id), ['right-day'])
  assert.equal(review.focusSessions, 2)
  assert.equal(review.focusMinutes, 75)
})

test('buildDayReview handles an empty day without dividing by zero', () => {
  const review = buildDayReview({ date: DAY, blocks: [], cards: [], log: { days: {} } })
  assert.deepEqual(review.summary, { total: 0, done: 0, skipped: 0, unlogged: 0, loggedPct: 0 })
})
