import test from 'node:test'
import assert from 'node:assert/strict'

import { buildStudyStreak } from '../src/utils/insights.js'

// Study days are driven via focus-session dates (plain YYYY-MM-DD strings keep
// the test timezone-independent) and via cumulative snapshots.
function focusCard(days) {
  return { done: false, activity: [], focusSessions: days.map((at) => ({ at })) }
}

// The streak only counts days inside the campaign. These grace/consecutive
// cases are about the walk itself, so they run in an explicit early window that
// contains their dates; the campaign boundary is exercised separately below.
const OPEN = { schedule: { campaignStart: '2026-07-01' } }

test('counts consecutive study days up to and including today', () => {
  const streak = buildStudyStreak([focusCard(['2026-07-11', '2026-07-12', '2026-07-13'])], {}, '2026-07-13', OPEN)
  assert.equal(streak.current, 3)
  assert.equal(streak.studiedToday, true)
  assert.equal(streak.graceUsed, false)
})

test('a single missed day is forgiven by the grace day', () => {
  // Studied 13th, 12th, and 10th — 11th is a gap that grace should bridge.
  const streak = buildStudyStreak([focusCard(['2026-07-10', '2026-07-12', '2026-07-13'])], {}, '2026-07-13', OPEN)
  assert.equal(streak.current, 3)
  assert.equal(streak.graceUsed, true)
  assert.equal(streak.graceAvailable, false)
})

test('two consecutive missed days break the streak', () => {
  // Studied 13th then nothing until the 10th — an unbridgeable two-day gap.
  const streak = buildStudyStreak([focusCard(['2026-07-10', '2026-07-13'])], {}, '2026-07-13', OPEN)
  assert.equal(streak.current, 1)
  assert.equal(streak.graceUsed, false)
})

test('an unstudied today does not break yesterday-anchored streaks', () => {
  const streak = buildStudyStreak([focusCard(['2026-07-11', '2026-07-12'])], {}, '2026-07-13', OPEN)
  assert.equal(streak.current, 2)
  assert.equal(streak.studiedToday, false)
  assert.equal(streak.graceUsed, false)
})

test('no activity yields an empty, grace-available streak', () => {
  const streak = buildStudyStreak([], {}, '2026-07-13', OPEN)
  assert.equal(streak.current, 0)
  assert.equal(streak.studiedToday, false)
  assert.equal(streak.graceAvailable, true)
})

test('logged hours in a cumulative snapshot count as a study day', () => {
  const snapshots = {
    '2026-07-12': { loggedHours: 2, done: 1 },
    '2026-07-13': { loggedHours: 4.5, done: 1 },
  }
  const streak = buildStudyStreak([], snapshots, '2026-07-13', OPEN)
  assert.equal(streak.current, 2)
  assert.equal(streak.studiedToday, true)
})

test('grace is never spent on empty pre-history (no phantom streak)', () => {
  // Only the 13th has activity; walking back must not consume grace forever.
  const streak = buildStudyStreak([focusCard(['2026-07-13'])], {}, '2026-07-13', OPEN)
  assert.equal(streak.current, 1)
  assert.equal(streak.graceUsed, false)
})

// ---------------------------------------------------------------------------
// Campaign boundary. Work done under an abandoned pre-reset plan is history,
// not part of this run: on day one the streak must read "1 day", never a
// multi-day run carried over from before the campaign existed.
// ---------------------------------------------------------------------------

const CAMPAIGN = { schedule: { campaignStart: '2026-07-16' } }

test('pre-campaign study days never count toward the campaign streak', () => {
  // Studied every day from the 13th, but the campaign only starts on the 16th.
  const streak = buildStudyStreak(
    [focusCard(['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'])],
    {},
    '2026-07-16',
    CAMPAIGN,
  )
  assert.equal(streak.current, 1, 'day one of the campaign is a one-day streak')
  assert.equal(streak.totalDays, 1)
  assert.equal(streak.graceUsed, false)
})

test('grace is not spent bridging backwards across the campaign start', () => {
  // The live 16 July regression: 13th and 14th active, 15th idle, 16th active.
  // Grace must not reach back over the reset to stitch the 14th onto day one.
  const snapshots = {
    '2026-07-13': { loggedHours: 0.3, done: 0 },
    '2026-07-14': { loggedHours: 0.3, done: 2 },
    '2026-07-15': { loggedHours: 0.3, done: 2 },
    '2026-07-16': { loggedHours: 0.3, done: 3 },
  }
  const streak = buildStudyStreak([], snapshots, '2026-07-16', CAMPAIGN)
  assert.equal(streak.current, 1)
  assert.equal(streak.graceUsed, false, 'no grace can be spent on day one')
  assert.equal(streak.graceAvailable, true)
})

test('the first campaign day is measured against its true pre-campaign baseline', () => {
  // Cumulative hours already stood at 9 before the campaign and did not move on
  // the 16th: the day has no new work, so it is not a study day.
  const snapshots = {
    '2026-07-15': { loggedHours: 9, done: 4 },
    '2026-07-16': { loggedHours: 9, done: 4 },
  }
  const streak = buildStudyStreak([], snapshots, '2026-07-16', CAMPAIGN)
  assert.equal(streak.current, 0, 'inherited cumulative totals are not day-one activity')
  assert.equal(streak.studiedToday, false)
})

test('a streak still builds normally once the campaign is running', () => {
  const streak = buildStudyStreak(
    [focusCard(['2026-07-16', '2026-07-17', '2026-07-18'])],
    {},
    '2026-07-18',
    CAMPAIGN,
  )
  assert.equal(streak.current, 3)
  assert.equal(streak.studiedToday, true)
})

test('a pre-campaign reference date has no campaign streak yet', () => {
  const streak = buildStudyStreak([focusCard(['2026-07-14'])], {}, '2026-07-15', CAMPAIGN)
  assert.equal(streak.current, 0)
  assert.equal(streak.graceAvailable, true)
})
