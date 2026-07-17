import test from 'node:test'
import assert from 'node:assert/strict'

import { buildHoursSeries, buildPace } from '../src/utils/history.js'

const schedule = {
  campaignStart: '2026-07-13',
  campaignEnd: '2026-08-28',
  examWindowStart: '2026-08-17',
}

const cards = Array.from({ length: 35 }, (_, index) => ({
  id: `pace-card-${index + 1}`,
  number: index + 1,
  done: false,
  activity: [],
}))

test('required pace counts only readiness days before the exam window', () => {
  const preLaunch = buildPace(cards, '2026-07-12', { schedule })
  assert.equal(preLaunch.studyDaysLeft, 35)
  assert.equal(preLaunch.requiredPerDay, 1)

  const launchDay = buildPace(cards, '2026-07-13', { schedule })
  assert.equal(launchDay.studyDaysLeft, 35)

  const finalReadinessDay = buildPace(cards, '2026-08-16', { schedule })
  assert.equal(finalReadinessDay.studyDaysLeft, 1)

  const examWindow = buildPace(cards, '2026-08-17', { schedule })
  assert.equal(examWindow.studyDaysLeft, 0)
})

// ---------------------------------------------------------------------------
// Hours series — campaign window. The bars sit beside the burn-up and heatmap,
// which both start at campaignStart, so the hours chart must use that same
// window rather than plotting days from an abandoned pre-reset plan.
// ---------------------------------------------------------------------------

const hoursSchedule = { schedule: { campaignStart: '2026-07-16' } }

test('hours series drops pre-campaign snapshot days', () => {
  const snapshots = {
    '2026-07-13': { loggedHours: 0.3, done: 0 },
    '2026-07-15': { loggedHours: 0.3, done: 2 },
    '2026-07-16': { loggedHours: 2.3, done: 3 },
    '2026-07-17': { loggedHours: 5.3, done: 4 },
  }
  const { series, totalLogged } = buildHoursSeries(snapshots, 'day', hoursSchedule)
  assert.deepEqual(series.map((point) => point.day), ['2026-07-16', '2026-07-17'])
  // 0.3h of pre-campaign work is history and must not be re-credited here.
  assert.equal(totalLogged, 5)
})

test('the first campaign day is diffed against its pre-campaign baseline', () => {
  // Cumulative hours ran to 9 before the reset. The 16th adds 1h of real work,
  // so it must show 1 — not absorb the 9 inherited hours as a day-one spike.
  const snapshots = {
    '2026-07-15': { loggedHours: 9, done: 4 },
    '2026-07-16': { loggedHours: 10, done: 5 },
  }
  const { series, totalLogged } = buildHoursSeries(snapshots, 'day', hoursSchedule)
  assert.equal(series.length, 1)
  assert.equal(series[0].logged, 1, 'pre-campaign hours must not land on day one')
  assert.equal(totalLogged, 1)
})

test('an all-pre-campaign history yields an empty hours series', () => {
  const snapshots = { '2026-07-13': { loggedHours: 4, done: 2 } }
  const { series, totalLogged } = buildHoursSeries(snapshots, 'day', hoursSchedule)
  assert.deepEqual(series, [])
  assert.equal(totalLogged, 0)
})
