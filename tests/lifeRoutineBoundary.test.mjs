// The life/health boundary.
//
// Non-academic routines remain outside academic re-planning and evidence rules.
// They still share the universal date truth used by Table, Today, Review and
// Columns, so an unfinished dated card is visibly past due everywhere.
//
// These tests pin the boundary itself rather than any particular routine set, so
// the routine catalogue can grow without weakening the guarantee.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { KIND_META, cardKind, isOverdue, kindFeatures, requiresEvidence } from '../src/utils/progress.js'
import { buildReplan, computeReplanSchedule } from '../src/utils/replan.js'
import { buildWeeklyLifeCardInputs } from '../src/utils/lifeCards.js'

const REFERENCE = '2026-07-30'
const WEEK_START = '2026-07-20'

const lifeCard = (overrides = {}) => ({
  id: 'life-1',
  title: 'LIFE — Groceries + supermarket run (w/c 20 Jul)',
  moduleGroup: 'General',
  module: 'General',
  phase: 'Phase 0',
  status: 'This Week',
  priority: 'Low',
  dueDate: '2026-07-26', // four days before the reference date
  startDate: WEEK_START,
  estimatedHours: 1,
  done: false,
  custom: true,
  checklist: [],
  ...overrides,
})

const studyCard = (overrides = {}) => ({
  id: 'study-1',
  title: 'Revise CLT',
  moduleGroup: 'Time Series',
  module: 'Time Series',
  phase: 'Phase 0',
  status: 'Backlog',
  priority: 'High',
  dueDate: '2026-07-26',
  startDate: WEEK_START,
  estimatedHours: 2,
  done: false,
  checklist: [],
  ...overrides,
})

// --- missing a life routine does not increase academic backlog -------------

test('a missed life routine is past due in the universal tracker', () => {
  const missed = lifeCard()
  assert.equal(cardKind(missed), 'life')
  assert.equal(isOverdue(missed, REFERENCE), true)
})

test('a missed health routine is past due in the universal tracker', () => {
  const missed = lifeCard({ id: 'health-1', moduleGroup: 'Health', title: 'HEALTH — Three movement breaks' })
  assert.equal(cardKind(missed), 'life')
  assert.equal(isOverdue(missed, REFERENCE), true)
})

test('an equivalent study card with the same past due date IS overdue', () => {
  // The control: overdue detection works, and life cards are exempt by kind,
  // not because the date comparison is broken.
  assert.equal(isOverdue(studyCard(), REFERENCE), true)
})

test('life routines never demand evidence', () => {
  assert.equal(requiresEvidence(lifeCard()), false)
  assert.equal(kindFeatures(lifeCard()).evidence, false)
  assert.equal(kindFeatures(lifeCard()).overdue, true)
})

test('no card kind opts out of shared date accountability', () => {
  const exempt = Object.entries(KIND_META)
    .filter(([, meta]) => !meta.overdue)
    .map(([kind]) => kind)
  assert.deepEqual(exempt, [])
})

test('every generated weekly routine remains outside academic evidence rules', () => {
  for (const input of buildWeeklyLifeCardInputs(WEEK_START)) {
    const card = lifeCard({ moduleGroup: input.module, title: input.title })
    const kind = cardKind(card)
    assert.ok(['life', 'admin'].includes(kind), `${input.title} is a ${kind} card`)
    if (kind === 'life') assert.equal(isOverdue(card, REFERENCE), true)
    // The bounded admin hour is deliberately an admin card: campaign admin does
    // carry deadlines. It still must never be an exam-group card.
    assert.notEqual(input.module, 'Time Series')
    assert.notEqual(input.module, 'Applied ML')
    assert.notEqual(input.module, 'MAT700')
  }
})

// --- replanning never moves life routines ---------------------------------

test('re-planning never reschedules a life or health routine', () => {
  const cards = [studyCard(), lifeCard(), lifeCard({ id: 'health-1', moduleGroup: 'Health' })]
  const plan = buildReplan(cards, { referenceDate: REFERENCE, mat700Active: true })
  const movedIds = (plan.assignments ?? []).map((assignment) => assignment.cardId)
  assert.ok(!movedIds.includes('life-1'), 'the grocery run stays where it is')
  assert.ok(!movedIds.includes('health-1'), 'the movement breaks stay where they are')
})

test('re-plan capacity scheduling only ever touches exam-group cards', () => {
  const cards = [studyCard(), lifeCard(), lifeCard({ id: 'health-1', moduleGroup: 'Health' })]
  const schedule = computeReplanSchedule(cards, {
    referenceDate: REFERENCE,
    mat700Active: true,
    expandForDate: () => [],
  })
  for (const assignment of schedule.assignments ?? []) {
    const card = cards.find((item) => item.id === assignment.cardId)
    assert.notEqual(cardKind(card), 'life', `${assignment.cardId} is a life routine and must not be re-planned`)
  }
})

test('a life routine cannot be dragged into re-planning by an exam-shaped phase', () => {
  // A routine carrying the same phase/priority as exam work must still be
  // excluded — the filter is by module group, not by how urgent it looks.
  const disguised = lifeCard({ id: 'life-disguised', phase: 'Phase 2', priority: 'High', status: 'Today' })
  const plan = buildReplan([studyCard(), disguised], { referenceDate: REFERENCE, mat700Active: true })
  const movedIds = (plan.assignments ?? []).map((assignment) => assignment.cardId)
  assert.ok(!movedIds.includes('life-disguised'))
})

// --- no duplicate recurring occurrences -----------------------------------

test('weekly routine generation is deterministic for a given week', () => {
  assert.deepEqual(buildWeeklyLifeCardInputs(WEEK_START), buildWeeklyLifeCardInputs(WEEK_START))
})

test('routine recurrence keys are unique within a week and distinct across weeks', () => {
  const thisWeek = buildWeeklyLifeCardInputs(WEEK_START)
  const nextWeek = buildWeeklyLifeCardInputs('2026-07-27')
  const keys = thisWeek.map((input) => input.recurrenceKey)
  assert.equal(new Set(keys).size, keys.length, 'no duplicate identities within a week')
  for (const input of thisWeek) {
    assert.ok(!nextWeek.some((next) => next.recurrenceKey === input.recurrenceKey), `${input.title} is week-specific`)
  }
})

test('routines stay inside their own week', () => {
  for (const input of buildWeeklyLifeCardInputs(WEEK_START)) {
    assert.ok(input.startDate >= WEEK_START, `${input.title} does not start before its week`)
    assert.ok(input.dueDate >= WEEK_START, `${input.title} is not due before its week`)
    assert.ok(input.dueDate <= '2026-07-26', `${input.title} is due within its week`)
  }
})
