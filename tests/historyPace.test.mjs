import test from 'node:test'
import assert from 'node:assert/strict'

import { buildPace } from '../src/utils/history.js'

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
