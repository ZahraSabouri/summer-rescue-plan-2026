import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyBlockTimeOverride,
  blockLogKey,
  buildDayReview,
  isFixedScheduleBlock,
  previousReviewDates,
} from '../src/utils/dayReview.js'

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

test('only exam modules, confirmed classes, and sleep have fixed times', () => {
  assert.equal(isFixedScheduleBlock({ moduleGroup: 'Applied ML', category: 'study' }), true)
  assert.equal(isFixedScheduleBlock({ moduleGroup: 'Time Series', category: 'study' }), true)
  assert.equal(isFixedScheduleBlock({ moduleGroup: 'MAT700', category: 'admin' }), true)
  assert.equal(isFixedScheduleBlock({ moduleGroup: 'Group Project', category: 'class' }), true)
  assert.equal(isFixedScheduleBlock({ category: 'sleep' }), true)
  assert.equal(isFixedScheduleBlock({ moduleGroup: 'Admin', category: 'admin', protected: true }), false)
  assert.equal(isFixedScheduleBlock({ moduleGroup: 'Group Project', category: 'project', protected: true }), false)
  assert.equal(isFixedScheduleBlock({ category: 'commute' }), false)
})

test('flexible time overrides preserve the original log key and fixed blocks ignore overrides', () => {
  const admin = { id: 'admin', start: '20:15', end: '20:25', category: 'admin', moduleGroup: 'Admin' }
  const moved = applyBlockTimeOverride(admin, { scheduledStart: '08:30', scheduledEnd: '08:40' })
  assert.equal(moved.start, '08:30')
  assert.equal(moved.end, '08:40')
  assert.equal(blockLogKey(moved), 'admin@20:15')
  assert.equal(moved.timeAdjusted, true)

  const fixed = applyBlockTimeOverride(
    { id: 'aml', start: '09:00', end: '11:00', category: 'study', moduleGroup: 'Applied ML' },
    { scheduledStart: '14:00', scheduledEnd: '16:00' },
  )
  assert.equal(fixed.start, '09:00')
  assert.equal(fixed.end, '11:00')
  assert.equal(fixed.timeAdjusted, false)
})

test('previousReviewDates returns the seven completed days before today', () => {
  assert.deepEqual(previousReviewDates('2026-07-17'), [
    '2026-07-10',
    '2026-07-11',
    '2026-07-12',
    '2026-07-13',
    '2026-07-14',
    '2026-07-15',
    '2026-07-16',
  ])
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

test('buildDayReview exposes flexible details for each planned block', () => {
  const log = {
    days: {
      [DAY]: {
        blocks: {},
        blockDetails: {
          'study-am@09:00': { actualStart: '09:20', actualEnd: '10:05', progressPercent: 35, note: 'Half of section 1' },
        },
      },
    },
  }
  const review = buildDayReview({ date: DAY, blocks: BLOCKS, cards: [], log })
  const study = review.entries.find((entry) => entry.block.id === 'study-am')
  assert.deepEqual(study.detail, {
    actualStart: '09:20',
    actualEnd: '10:05',
    progressPercent: 35,
    note: 'Half of section 1',
  })
  assert.equal(study.status, 'unlogged', 'partial progress does not falsely mark the block done')
})

test('buildDayReview applies a flexible planned-time change without changing its identity', () => {
  const log = {
    days: {
      [DAY]: {
        blocks: { 'lunch@12:30': 'done' },
        blockDetails: {
          'lunch@12:30': { scheduledStart: '08:30', scheduledEnd: '09:00' },
          'study-am@09:00': { scheduledStart: '18:00', scheduledEnd: '20:00' },
        },
      },
    },
  }
  const review = buildDayReview({ date: DAY, blocks: BLOCKS, cards: [], log })
  const lunch = review.entries.find((entry) => entry.key === 'lunch@12:30')
  const study = review.entries.find((entry) => entry.key === 'study-am@09:00')
  assert.equal(lunch.block.start, '08:30')
  assert.equal(lunch.status, 'done')
  assert.equal(study.block.start, '18:00', 'unlabelled study fixture is flexible')
  assert.equal(blockLogKey(lunch.block), 'lunch@12:30')
  assert.equal(review.entries[0].key, 'wake@07:00')
  assert.equal(review.entries[1].key, 'lunch@12:30')
})
