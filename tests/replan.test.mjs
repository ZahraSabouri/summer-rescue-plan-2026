import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildReplan, computeReplanSchedule } from '../src/utils/replan.js'
import { addDays } from '../src/utils/progress.js'

function card(overrides) {
  return { number: 1, moduleGroup: 'Applied ML', done: false, estimatedHours: 10, ...overrides }
}

const REF = '2026-07-14' // 33 days to 2026-08-16

test('capacity = days left x daily hours', () => {
  const r = buildReplan([], { referenceDate: REF, dailyHours: 8, projectHours: 0 })
  assert.equal(r.daysLeft, 33)
  assert.equal(r.capacity, 264)
})

test('compression ratio reflects study capacity vs exam hours', () => {
  const cards = [
    card({ moduleGroup: 'Applied ML', estimatedHours: 200 }),
    card({ moduleGroup: 'Time Series', estimatedHours: 200 }),
  ]
  const r = buildReplan(cards, { referenceDate: REF, dailyHours: 8, projectHours: 40 })
  assert.equal(r.examHours, 400)
  assert.equal(r.studyCapacity, 224) // 264 - 40
  assert.equal(r.fits, false)
  assert.ok(r.overBy > 0)
  assert.ok(r.ratio > 0 && r.ratio < 1)
  // targets scale down by the ratio and never exceed outstanding
  const total = r.modules.reduce((s, m) => s + m.target, 0)
  assert.ok(total <= r.studyCapacity + 1)
})

test('no compression when the work already fits', () => {
  const cards = [card({ estimatedHours: 50 })]
  const r = buildReplan(cards, { referenceDate: REF, dailyHours: 8, projectHours: 0 })
  assert.equal(r.fits, true)
  assert.equal(r.ratio, 1)
  assert.equal(r.compressionPct, 0)
  assert.equal(r.modules[0].target, 50)
  assert.equal(r.modules[0].cut, 0)
})

test('done and non-exam cards are excluded from exam hours', () => {
  const cards = [
    card({ estimatedHours: 30 }),
    card({ estimatedHours: 30, done: true }),
    card({ moduleGroup: 'Job Hunt', estimatedHours: 30 }),
  ]
  const r = buildReplan(cards, { referenceDate: REF, projectHours: 0 })
  assert.equal(r.examHours, 30)
  assert.equal(r.modules.length, 1)
})

test('supports the hours field as well as estimatedHours', () => {
  const cards = [{ number: 2, moduleGroup: 'MAT700', done: false, hours: 40 }]
  const r = buildReplan(cards, { referenceDate: REF, projectHours: 0 })
  assert.equal(r.examHours, 40)
})

test('computeReplanSchedule packs by priority into days and flags overflow', () => {
  const cards = [
    { id: 'lo', number: 3, moduleGroup: 'Applied ML', done: false, priority: 'Low', estimatedHours: 8, dueDate: '2026-07-05' },
    { id: 'hi', number: 1, moduleGroup: 'Applied ML', done: false, priority: 'Critical', estimatedHours: 8, dueDate: '2026-07-20' },
    { id: 'mid', number: 2, moduleGroup: 'Time Series', done: false, priority: 'High', estimatedHours: 8, dueDate: '2026-07-10' },
  ]
  const { assignments } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8 })
  // Critical first (day 0 = today), then High (day 1), then Low (day 2)
  assert.deepEqual(assignments.map((a) => a.cardId), ['hi', 'mid', 'lo'])
  assert.equal(assignments[0].dueDate, '2026-07-14')
  assert.equal(assignments[1].dueDate, '2026-07-15')
  assert.equal(assignments[2].dueDate, '2026-07-16')
})

test('computeReplanSchedule skips days with no free study blocks', () => {
  const cards = [
    { id: 'a', number: 1, moduleGroup: 'Applied ML', done: false, priority: 'Critical', estimatedHours: 4, dueDate: '2026-07-20' },
    { id: 'b', number: 2, moduleGroup: 'Applied ML', done: false, priority: 'Critical', estimatedHours: 4, dueDate: '2026-07-20' },
  ]
  // 15 July is fully occupied (class/travel day): zero study hours.
  const capacityForDate = (date) => (date === '2026-07-15' ? 0 : 4)
  const { assignments } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8, capacityForDate })
  assert.equal(assignments[0].dueDate, '2026-07-14') // 4h fills today's 4 free hours
  assert.equal(assignments[1].dueDate, '2026-07-16') // 15th is busy — card lands on the 16th
})

test('computeReplanSchedule deprioritises low-yield timed re-runs to the end', () => {
  const cards = [
    { id: 'rerun', number: 1, moduleGroup: 'Applied ML', done: false, priority: 'Critical', estimatedHours: 8, dueDate: '2026-07-01', title: 'AML S3 — Lab 3 timed re-run + recall' },
    { id: 'core', number: 2, moduleGroup: 'Applied ML', done: false, priority: 'High', estimatedHours: 8, dueDate: '2026-07-20', title: 'AML S3 — Run Lab 3 clean' },
  ]
  const { assignments, trimmed } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8 })
  assert.equal(trimmed, 1)
  // Core work schedules first despite the re-run being Critical and older.
  assert.deepEqual(assignments.map((a) => a.cardId), ['core', 'rerun'])
})

test('computeReplanSchedule marks stretch cards as Backlog status', () => {
  const cards = Array.from({ length: 40 }, (_, i) => ({
    id: `c${i}`, number: i, moduleGroup: 'Time Series', done: false, priority: 'High', estimatedHours: 8, dueDate: '2026-07-20',
  }))
  const { assignments } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8 })
  for (const a of assignments) {
    assert.equal(a.status, a.stretch ? 'Backlog' : 'This Week')
  }
})

test('computeReplanSchedule flags cards beyond readiness as stretch', () => {
  // 60 cards x 8h at 8h/day = 60 days of work, well past 33 days to readiness
  const cards = Array.from({ length: 60 }, (_, i) => ({
    id: `c${i}`,
    number: i,
    moduleGroup: 'Applied ML',
    done: false,
    priority: 'High',
    estimatedHours: 8,
    dueDate: '2026-07-20',
  }))
  const { assignments, overflow } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8 })
  assert.ok(overflow > 0)
  assert.ok(assignments.some((a) => a.stretch))
  assert.ok(assignments.slice(0, 20).every((a) => !a.stretch)) // early ones fit
})

test('buildStudyCapacityLookup counts only study blocks and guards bad times', async () => {
  const { buildStudyCapacityLookup } = await import('../src/utils/replan.js')
  const lookup = buildStudyCapacityLookup(() => [
    { category: 'study', start: '09:00', end: '12:00' }, // 3h counts
    { category: 'class', start: '13:00', end: '15:00' }, // busy time — never counts
    { category: 'study', start: 'nope', end: '17:00' }, // NaN guard — skipped
    { category: 'study', start: '18:00', end: '19:30' }, // 1.5h counts
  ])
  assert.equal(lookup('2026-07-14'), 4.5)
})

test('buildStudyCapacityLookup memoises per date', async () => {
  const { buildStudyCapacityLookup } = await import('../src/utils/replan.js')
  let calls = 0
  const lookup = buildStudyCapacityLookup(() => {
    calls += 1
    return [{ category: 'study', start: '09:00', end: '11:00' }]
  })
  assert.equal(lookup('2026-07-14'), 2)
  assert.equal(lookup('2026-07-14'), 2)
  assert.equal(lookup('2026-07-15'), 2)
  assert.equal(calls, 2, 'one expansion per distinct date')
})

test('computeReplanSchedule caps generous timetable days at dailyHours', () => {
  const cards = [
    { id: 'a', number: 1, moduleGroup: 'Applied ML', done: false, priority: 'High', estimatedHours: 16, dueDate: '2026-07-20' },
  ]
  // Timetable says 12h free, but the sustainable cap is 8h/day → 16h spans 2 days.
  const { assignments } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8, capacityForDate: () => 12 })
  assert.equal(assignments[0].dueDate, '2026-07-15')
})

test('computeReplanSchedule is bounded by the packing horizon', () => {
  const cards = [
    { id: 'huge', number: 1, moduleGroup: 'Applied ML', done: false, priority: 'High', estimatedHours: 10000, dueDate: '2026-07-20' },
    { id: 'after', number: 2, moduleGroup: 'Applied ML', done: false, priority: 'Low', estimatedHours: 4, dueDate: '2026-07-20' },
  ]
  const { assignments } = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8 })
  // 10000h can never finish — the horizon stops the walk instead of spinning,
  // and everything after the monster card lands on the horizon date too.
  const horizonDate = addDays(REF, 240)
  assert.equal(assignments[0].dueDate, horizonDate)
  assert.ok(assignments.every((a) => a.dueDate <= horizonDate))
  assert.ok(assignments[0].stretch)
})

test('computeReplanSchedule reports packed vs stretch hours for the headline', () => {
  const cards = Array.from({ length: 60 }, (_, i) => ({
    id: `c${i}`, number: i, moduleGroup: 'Applied ML', done: false, priority: 'High', estimatedHours: 8, dueDate: '2026-07-20',
  }))
  const result = computeReplanSchedule(cards, { referenceDate: REF, dailyHours: 8 })
  assert.equal(result.packedHours + result.stretchHours, 480)
  const stretchSum = result.assignments.filter((a) => a.stretch).length * 8
  assert.equal(result.stretchHours, stretchSum)
  assert.ok(result.stretchHours > 0)
})
