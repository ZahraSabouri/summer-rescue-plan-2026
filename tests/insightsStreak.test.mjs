import test from 'node:test'
import assert from 'node:assert/strict'

import { buildStudyStreak } from '../src/utils/insights.js'

// Study days are driven via focus-session dates (plain YYYY-MM-DD strings keep
// the test timezone-independent) and via cumulative snapshots.
function focusCard(days) {
  return { done: false, activity: [], focusSessions: days.map((at) => ({ at })) }
}

test('counts consecutive study days up to and including today', () => {
  const streak = buildStudyStreak([focusCard(['2026-07-11', '2026-07-12', '2026-07-13'])], {}, '2026-07-13')
  assert.equal(streak.current, 3)
  assert.equal(streak.studiedToday, true)
  assert.equal(streak.graceUsed, false)
})

test('a single missed day is forgiven by the grace day', () => {
  // Studied 13th, 12th, and 10th — 11th is a gap that grace should bridge.
  const streak = buildStudyStreak([focusCard(['2026-07-10', '2026-07-12', '2026-07-13'])], {}, '2026-07-13')
  assert.equal(streak.current, 3)
  assert.equal(streak.graceUsed, true)
  assert.equal(streak.graceAvailable, false)
})

test('two consecutive missed days break the streak', () => {
  // Studied 13th then nothing until the 10th — an unbridgeable two-day gap.
  const streak = buildStudyStreak([focusCard(['2026-07-10', '2026-07-13'])], {}, '2026-07-13')
  assert.equal(streak.current, 1)
  assert.equal(streak.graceUsed, false)
})

test('an unstudied today does not break yesterday-anchored streaks', () => {
  const streak = buildStudyStreak([focusCard(['2026-07-11', '2026-07-12'])], {}, '2026-07-13')
  assert.equal(streak.current, 2)
  assert.equal(streak.studiedToday, false)
  assert.equal(streak.graceUsed, false)
})

test('no activity yields an empty, grace-available streak', () => {
  const streak = buildStudyStreak([], {}, '2026-07-13')
  assert.equal(streak.current, 0)
  assert.equal(streak.studiedToday, false)
  assert.equal(streak.graceAvailable, true)
})

test('logged hours in a cumulative snapshot count as a study day', () => {
  const snapshots = {
    '2026-07-12': { loggedHours: 2, done: 1 },
    '2026-07-13': { loggedHours: 4.5, done: 1 },
  }
  const streak = buildStudyStreak([], snapshots, '2026-07-13')
  assert.equal(streak.current, 2)
  assert.equal(streak.studiedToday, true)
})

test('grace is never spent on empty pre-history (no phantom streak)', () => {
  // Only the 13th has activity; walking back must not consume grace forever.
  const streak = buildStudyStreak([focusCard(['2026-07-13'])], {}, '2026-07-13')
  assert.equal(streak.current, 1)
  assert.equal(streak.graceUsed, false)
})
