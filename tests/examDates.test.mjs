import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMPAIGN_START,
  EXAM_MODULES,
  EXAM_WINDOW_END,
  EXAM_WINDOW_START,
  applyModuleExamDate,
  confirmedExamDates,
  examCountdownDays,
  examWindow,
  isIsoDay,
  resolveExamTarget,
  resolveModuleExamDate,
  resolveModuleExamDates,
  validateModuleExamDate,
} from '../src/utils/examDates.js'
import {
  CAMPAIGN_START as PLAN_CAMPAIGN_START,
  EXAM_WINDOW_END as PLAN_EXAM_WINDOW_END,
  EXAM_WINDOW_START as PLAN_EXAM_WINDOW_START,
} from '../src/data/summerRescuePlan.js'
import { generateNotifications } from '../src/utils/notifications.js'

const SCHEDULE = {
  campaignStart: '2026-07-16',
  campaignEnd: '2026-08-16',
  examWindowStart: '2026-08-17',
}
const REFERENCE = '2026-07-16'

test('window constants have not drifted from the campaign plan', () => {
  assert.equal(CAMPAIGN_START, PLAN_CAMPAIGN_START)
  assert.equal(EXAM_WINDOW_START, PLAN_EXAM_WINDOW_START)
  assert.equal(EXAM_WINDOW_END, PLAN_EXAM_WINDOW_END)
})

test('the three examinable modules are modelled with their Cardiff codes', () => {
  assert.deepEqual(
    EXAM_MODULES.map((entry) => [entry.id, entry.code]),
    [
      ['aml', 'CMT307'],
      ['time-series', 'MAT508'],
      ['mat700', 'MAT700'],
    ],
  )
})

test('isIsoDay rejects malformed and calendar-invalid days', () => {
  assert.equal(isIsoDay('2026-08-20'), true)
  assert.equal(isIsoDay('2026-02-31'), false)
  assert.equal(isIsoDay('2026-8-20'), false)
  assert.equal(isIsoDay('20 August'), false)
  assert.equal(isIsoDay(''), false)
  assert.equal(isIsoDay(null), false)
  assert.equal(isIsoDay('2026-08-20T09:00:00Z'), false)
})

test('the exam window defaults to 17-28 August and survives a missing end', () => {
  assert.deepEqual(examWindow(SCHEDULE), { start: '2026-08-17', end: '2026-08-28' })
  assert.deepEqual(examWindow({}), { start: EXAM_WINDOW_START, end: EXAM_WINDOW_END })
})

// --- empty ---------------------------------------------------------------

test('empty module dates report unconfirmed rather than fake certainty', () => {
  const resolved = resolveModuleExamDates({}, SCHEDULE)
  assert.equal(resolved.length, 3)
  for (const entry of resolved) {
    assert.equal(entry.status, 'unconfirmed')
    assert.equal(entry.confirmed, false)
    assert.equal(entry.date, null)
  }
  assert.deepEqual(confirmedExamDates({}, SCHEDULE), [])
})

test('with no module dates the countdown target is an explicit window placeholder', () => {
  const target = resolveExamTarget({ moduleExamDates: {}, schedule: SCHEDULE, referenceDate: REFERENCE })
  assert.equal(target.source, 'window')
  assert.equal(target.confirmed, false)
  assert.equal(target.status, 'unconfirmed')
  assert.equal(target.label, 'exam window')
  assert.equal(target.moduleId, null)
  // The window start may be shown, but never as a per-module date.
  assert.equal(target.date, '2026-08-17')
  assert.equal(target.confirmedCount, 0)
})

test('the window start is never promoted into any module date', () => {
  for (const entry of resolveModuleExamDates({}, SCHEDULE)) {
    assert.notEqual(entry.date, SCHEDULE.examWindowStart)
    assert.equal(entry.date, null)
  }
})

// --- valid ---------------------------------------------------------------

test('a valid in-window date is accepted and confirmed', () => {
  const result = validateModuleExamDate('2026-08-20', { schedule: SCHEDULE })
  assert.equal(result.ok, true)
  assert.equal(result.status, 'valid')
  assert.equal(result.date, '2026-08-20')
  assert.equal(result.code, null)

  const resolved = resolveModuleExamDate('aml', { aml: '2026-08-20' }, SCHEDULE)
  assert.equal(resolved.status, 'confirmed')
  assert.equal(resolved.confirmed, true)
  assert.equal(resolved.date, '2026-08-20')
  assert.equal(resolved.outOfWindow, false)
  assert.equal(resolved.code, 'CMT307')
})

test('window boundary dates are inside the window', () => {
  assert.equal(validateModuleExamDate('2026-08-17', { schedule: SCHEDULE }).ok, true)
  assert.equal(validateModuleExamDate('2026-08-28', { schedule: SCHEDULE }).ok, true)
})

test('a confirmed date drives the countdown target and leaves others unconfirmed', () => {
  const dates = { aml: '2026-08-20' }
  const target = resolveExamTarget({ moduleExamDates: dates, schedule: SCHEDULE, referenceDate: REFERENCE })
  assert.equal(target.source, 'module')
  assert.equal(target.confirmed, true)
  assert.equal(target.moduleId, 'aml')
  assert.equal(target.label, 'Applied ML')
  assert.equal(target.date, '2026-08-20')
  assert.equal(target.confirmedCount, 1)
  assert.equal(target.moduleCount, 3)

  assert.equal(resolveModuleExamDate('time-series', dates, SCHEDULE).status, 'unconfirmed')
  assert.equal(resolveModuleExamDate('mat700', dates, SCHEDULE).status, 'unconfirmed')
})

test('the countdown targets the next upcoming confirmed exam', () => {
  const dates = { aml: '2026-08-25', 'time-series': '2026-08-19', mat700: '2026-08-21' }
  const target = resolveExamTarget({ moduleExamDates: dates, schedule: SCHEDULE, referenceDate: '2026-08-20' })
  assert.equal(target.moduleId, 'mat700')
  assert.equal(target.date, '2026-08-21')
  assert.equal(target.confirmedCount, 3)
})

test('countdown days are computed from whole calendar days', () => {
  assert.equal(examCountdownDays('2026-08-17', '2026-07-16'), 32)
  assert.equal(examCountdownDays('2026-07-16', '2026-07-16'), 0)
  assert.equal(examCountdownDays('2026-08-17', 'not-a-date'), null)
  assert.equal(examCountdownDays(null, '2026-07-16'), null)
})

// --- cleared -------------------------------------------------------------

test('clearing a date is a valid instruction that restores the unconfirmed state', () => {
  const cleared = validateModuleExamDate('', { schedule: SCHEDULE })
  assert.equal(cleared.ok, true)
  assert.equal(cleared.status, 'cleared')
  assert.equal(cleared.date, null)

  const after = applyModuleExamDate({ aml: '2026-08-20' }, 'aml', cleared.date)
  assert.deepEqual(after, {})
  assert.equal(resolveModuleExamDate('aml', after, SCHEDULE).status, 'unconfirmed')
  assert.equal(
    resolveExamTarget({ moduleExamDates: after, schedule: SCHEDULE, referenceDate: REFERENCE }).source,
    'window',
  )
})

test('a cleared key is removed rather than stored as an empty string', () => {
  const after = applyModuleExamDate({ aml: '2026-08-20', mat700: '2026-08-24' }, 'aml', null)
  assert.equal('aml' in after, false)
  assert.deepEqual(Object.keys(after), ['mat700'])
})

test('applying a date does not mutate the previous map', () => {
  const before = { aml: '2026-08-20' }
  const after = applyModuleExamDate(before, 'mat700', '2026-08-24')
  assert.deepEqual(before, { aml: '2026-08-20' })
  assert.deepEqual(after, { aml: '2026-08-20', mat700: '2026-08-24' })
})

// --- out of window -------------------------------------------------------

test('an out-of-window date is rejected unless the user confirms an exception', () => {
  const rejected = validateModuleExamDate('2026-09-04', { schedule: SCHEDULE })
  assert.equal(rejected.ok, false)
  assert.equal(rejected.code, 'out-of-window')
  assert.equal(rejected.date, null)
  assert.match(rejected.message, /2026-08-17 to 2026-08-28/)

  const confirmed = validateModuleExamDate('2026-09-04', { schedule: SCHEDULE, allowException: true })
  assert.equal(confirmed.ok, true)
  assert.equal(confirmed.date, '2026-09-04')
  assert.equal(confirmed.code, 'out-of-window')
})

test('a confirmed out-of-window date stays flagged once stored', () => {
  const resolved = resolveModuleExamDate('mat700', { mat700: '2026-09-04' }, SCHEDULE)
  assert.equal(resolved.status, 'confirmed')
  assert.equal(resolved.outOfWindow, true)
})

test('a pre-campaign date is always rejected, even as an exception', () => {
  for (const allowException of [false, true]) {
    const result = validateModuleExamDate('2026-07-01', { schedule: SCHEDULE, allowException })
    assert.equal(result.ok, false, `rejected with allowException=${allowException}`)
    assert.equal(result.code, 'pre-campaign')
    assert.equal(result.date, null)
  }
})

test('a malformed date is always rejected, even as an exception', () => {
  const result = validateModuleExamDate('2026-02-31', { schedule: SCHEDULE, allowException: true })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid')
})

test('a stored value that fails validation is reported unconfirmed, not rendered as fact', () => {
  const resolved = resolveModuleExamDate('aml', { aml: 'soon' }, SCHEDULE)
  assert.equal(resolved.status, 'unconfirmed')
  assert.equal(resolved.date, null)
  assert.equal(
    resolveExamTarget({ moduleExamDates: { aml: 'soon' }, schedule: SCHEDULE, referenceDate: REFERENCE }).source,
    'window',
  )
})

// --- connected consumers -------------------------------------------------

function examNotice(moduleExamDates, referenceDate) {
  const target = resolveExamTarget({ moduleExamDates, schedule: SCHEDULE, referenceDate })
  const notices = generateNotifications({
    cards: [],
    referenceDate,
    examCountdown: examCountdownDays(target.date, referenceDate),
    examConfirmed: target.confirmed,
    examLabel: target.label,
    campaignStart: SCHEDULE.campaignStart,
    createdAt: `${referenceDate}T00:00:00.000Z`,
  })
  return notices.find((notice) => notice.rule === 'exam-countdown') ?? null
}

test('the countdown notification counts to the window while dates are unconfirmed', () => {
  // 2026-07-18 is 30 days before the 2026-08-17 window start: a threshold day.
  const notice = examNotice({}, '2026-07-18')
  assert.ok(notice, 'a threshold notification is produced')
  assert.equal(notice.title, '30 days to the exam window')
  assert.match(notice.detail, /unconfirmed/i)
})

test('confirming a date renames the countdown notification to that module', () => {
  // 2026-07-21 is 30 days before a confirmed 2026-08-20 Applied ML exam.
  const notice = examNotice({ aml: '2026-08-20' }, '2026-07-21')
  assert.ok(notice, 'a threshold notification is produced')
  assert.equal(notice.title, '30 days to Applied ML')
  assert.doesNotMatch(notice.detail, /unconfirmed/i)
})

test('the exam-day notification distinguishes a sitting from the window opening', () => {
  assert.equal(examNotice({}, '2026-08-17').title, 'Exam window opens today')
  assert.equal(examNotice({ aml: '2026-08-20' }, '2026-08-20').title, 'Applied ML exam today')
})
