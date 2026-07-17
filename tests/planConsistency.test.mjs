import assert from 'node:assert/strict'
import test from 'node:test'

import { scheduleExceptions, scheduleRules } from '../src/data/summerRescuePlan.js'
import { buildDayReview, cardReviewLogKey } from '../src/utils/dayReview.js'
import { cardPlanLane, filterCards } from '../src/utils/progress.js'
import { buildDayTimeline, expandScheduleForDate, resolveScheduledCard } from '../src/utils/schedule.js'

const REFERENCE_DATE = '2026-07-17'

function card(overrides = {}) {
  return {
    id: 'card-1',
    number: 1,
    title: 'A card',
    module: 'Applied ML',
    moduleGroup: 'Applied ML',
    phase: 'Phase 0',
    priority: 'High',
    status: 'This Week',
    slotType: 'AM',
    tags: [],
    startDate: '2026-07-17',
    dueDate: '2026-07-17',
    done: false,
    ...overrides,
  }
}

test('plan lanes use one date-based definition across views', () => {
  assert.equal(cardPlanLane(card(), REFERENCE_DATE), 'Today')
  assert.equal(cardPlanLane(card({ dueDate: '2026-07-16' }), REFERENCE_DATE), 'Yesterday')
  assert.equal(cardPlanLane(card({ dueDate: '2026-07-12' }), REFERENCE_DATE), 'Past Week')
  assert.equal(cardPlanLane(card({ dueDate: '2026-06-20' }), REFERENCE_DATE), 'Past Month')
  assert.equal(cardPlanLane(card({ dueDate: '2026-07-18' }), REFERENCE_DATE), 'This Week')
  assert.equal(cardPlanLane(card({ dueDate: '2026-07-27' }), REFERENCE_DATE), 'Backlog')
  assert.equal(cardPlanLane(card({ status: 'Waiting / Blocked' }), REFERENCE_DATE), 'Waiting / Blocked')
  assert.equal(cardPlanLane(card({ status: 'Waiting / Blocked', dueDate: '2026-07-16' }), REFERENCE_DATE), 'Yesterday')
  assert.equal(cardPlanLane(card({ done: true }), REFERENCE_DATE), 'Done')
})

test('status filters use the same derived plan lane as Columns and Table', () => {
  const cards = [
    card({ id: 'today' }),
    card({ id: 'late', dueDate: '2026-07-16' }),
    card({ id: 'future', dueDate: '2026-07-27' }),
  ]
  const filters = {
    search: '',
    phase: 'all',
    module: 'all',
    kind: 'all',
    priority: 'all',
    status: 'Yesterday',
    slotType: 'all',
    tag: 'all',
    dateMode: 'all',
    exactDate: '',
  }

  assert.deepEqual(filterCards(cards, filters, REFERENCE_DATE).map((item) => item.id), ['late'])
})

test('schedule links the card active on that date before a later card', () => {
  const block = { date: '2026-07-16', moduleGroup: 'Group Project' }
  const cards = [
    card({ id: 'current', moduleGroup: 'Group Project', startDate: '2026-07-16', dueDate: '2026-07-19' }),
    card({ id: 'later', moduleGroup: 'Group Project', startDate: '2026-07-20', dueDate: '2026-07-26' }),
  ]

  assert.equal(resolveScheduledCard(block, cards)?.id, 'current')
})

test('July 16 admin timetable block is pinned to its actual card', () => {
  const block = expandScheduleForDate(scheduleRules, scheduleExceptions, '2026-07-16')
    .find((item) => item.id === 'admin-summer-assessment-confirmation-block')

  assert.equal(block?.cardId, 'admin-summer-assessment-confirmation')
  assert.equal(
    resolveScheduledCard(block, [
      card({ id: 'admin-summer-assessment-confirmation', moduleGroup: 'Admin', done: true }),
      card({ id: 'life-admin', moduleGroup: 'Admin' }),
    ])?.id,
    'admin-summer-assessment-confirmation',
  )
})

test('one day timeline embeds every due card inside its matching work block', () => {
  const blocks = expandScheduleForDate(scheduleRules, scheduleExceptions, '2026-07-16')
  const cards = [
    card({ id: 'admin-summer-assessment-confirmation', moduleGroup: 'Admin', dueDate: '2026-07-16', done: true }),
    card({ id: 'life-admin', moduleGroup: 'Admin', dueDate: '2026-07-16' }),
    card({ id: 'ts', moduleGroup: 'Time Series', dueDate: '2026-07-16' }),
    card({ id: 'mat700-foundation-reset', moduleGroup: 'MAT700', dueDate: '2026-07-16' }),
  ]
  const timeline = buildDayTimeline(blocks, cards, '2026-07-16')
  const embedded = timeline.entries.flatMap((entry) => entry.cards.map((item) => item.id))

  assert.deepEqual(new Set(embedded), new Set(cards.map((item) => item.id)))
  assert.deepEqual(timeline.unassignedCards, [])
})

test('one day timeline never pulls a different dated module card into an empty block', () => {
  const blocks = [{ id: 'aml', date: '2026-07-16', start: '09:00', end: '10:00', moduleGroup: 'Applied ML' }]
  const due = card({ id: 'due', dueDate: '2026-07-16' })
  const tomorrow = card({ id: 'tomorrow', dueDate: '2026-07-17' })
  const timeline = buildDayTimeline(blocks, [tomorrow, due], '2026-07-16')
  const ids = [
    ...timeline.entries.flatMap((entry) => entry.cards.map((item) => item.id)),
    ...timeline.unassignedCards.map((item) => item.id),
  ]

  assert.deepEqual(ids, ['due'])
})

test('review exposes every card due that day and preserves a skipped outcome', () => {
  const due = card({ id: 'due-card', dueDate: '2026-07-16' })
  const done = card({ id: 'done-card', dueDate: '2026-07-16', done: true })
  const later = card({ id: 'later-card', dueDate: '2026-07-17' })
  const review = buildDayReview({
    date: '2026-07-16',
    blocks: [],
    cards: [due, done, later],
    log: { days: { '2026-07-16': { blocks: { [cardReviewLogKey(due)]: 'skipped' } } } },
  })

  assert.deepEqual(review.dueCards.map((item) => item.id), ['due-card', 'done-card'])
  assert.equal(review.dueCards.find((item) => item.id === 'due-card')?.reviewStatus, 'skipped')
  assert.deepEqual(review.dueCardsOpen.map((item) => item.id), ['due-card'])
})
