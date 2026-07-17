// Exam-date confidence model.
//
// The overall Cardiff resit window (17-28 August 2026) is known. The personal
// per-module sitting dates are not. The window start must therefore never be
// promoted into a per-module date: a countdown that looks exact but is really a
// placeholder is worse than an admitted gap, because it silently reprioritises
// revision against a date that was invented.
//
// Three states are distinguishable at every consumer:
//   confirmed   - a real personal date has been entered for this module
//   unconfirmed - no personal date is known for this module
//   window      - the countdown is running against the overall window placeholder
//
// Constants are duplicated from data/summerRescuePlan.js rather than imported so
// that utils stay free of the card catalogue. examDates.test.mjs asserts they
// have not drifted apart.

export const CAMPAIGN_START = '2026-07-16'
export const EXAM_WINDOW_START = '2026-08-17'
export const EXAM_WINDOW_END = '2026-08-28'

export const EXAM_MODULES = [
  { id: 'aml', label: 'Applied ML', code: 'CMT307' },
  { id: 'time-series', label: 'Time Series', code: 'MAT508' },
  { id: 'mat700', label: 'MAT700', code: 'MAT700' },
]

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDay(value) {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return false
  // Reject calendar-invalid days that still match the shape, e.g. 2026-02-31.
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function examWindow(schedule = {}) {
  const start = isIsoDay(schedule.examWindowStart) ? schedule.examWindowStart : EXAM_WINDOW_START
  const rawEnd = isIsoDay(schedule.examWindowEnd) ? schedule.examWindowEnd : EXAM_WINDOW_END
  return { start, end: rawEnd < start ? start : rawEnd }
}

export function examModule(moduleId) {
  return EXAM_MODULES.find((entry) => entry.id === moduleId) ?? null
}

/**
 * Validate a candidate module exam date before it is allowed into state.
 * An empty value is a legitimate "clear this date" instruction, not an error.
 */
export function validateModuleExamDate(value, { schedule = {}, allowException = false } = {}) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    return { ok: true, status: 'cleared', date: null, code: null, message: '' }
  }
  if (!isIsoDay(text)) {
    return {
      ok: false,
      status: 'invalid',
      date: null,
      code: 'invalid',
      message: 'Enter a valid calendar date (YYYY-MM-DD).',
    }
  }

  const campaignStart = isIsoDay(schedule.campaignStart) ? schedule.campaignStart : CAMPAIGN_START
  if (text < campaignStart) {
    return {
      ok: false,
      status: 'invalid',
      date: null,
      code: 'pre-campaign',
      message: `An exam cannot fall before the campaign starts on ${campaignStart}.`,
    }
  }

  const { start, end } = examWindow(schedule)
  if (text < start || text > end) {
    if (!allowException) {
      return {
        ok: false,
        status: 'out-of-window',
        date: null,
        code: 'out-of-window',
        message: `That date is outside the ${start} to ${end} exam window. Confirm to record it anyway.`,
      }
    }
    return {
      ok: true,
      status: 'valid',
      date: text,
      code: 'out-of-window',
      message: `Recorded outside the ${start} to ${end} exam window.`,
    }
  }

  return { ok: true, status: 'valid', date: text, code: null, message: '' }
}

/**
 * Resolve one module's exam date into an explicit confidence state.
 * A stored value that fails validation is reported as unconfirmed rather than
 * being silently rendered as fact.
 */
export function resolveModuleExamDate(moduleId, moduleExamDates = {}, schedule = {}) {
  const meta = examModule(moduleId) ?? { id: moduleId, label: moduleId, code: moduleId }
  const { start, end } = examWindow(schedule)
  const raw = moduleExamDates?.[moduleId]
  const date = isIsoDay(raw) ? raw : null

  return {
    moduleId: meta.id,
    label: meta.label,
    code: meta.code,
    status: date ? 'confirmed' : 'unconfirmed',
    confirmed: Boolean(date),
    date,
    windowStart: start,
    windowEnd: end,
    outOfWindow: Boolean(date) && (date < start || date > end),
  }
}

export function resolveModuleExamDates(moduleExamDates = {}, schedule = {}) {
  return EXAM_MODULES.map((entry) => resolveModuleExamDate(entry.id, moduleExamDates, schedule))
}

export function confirmedExamDates(moduleExamDates = {}, schedule = {}) {
  return resolveModuleExamDates(moduleExamDates, schedule).filter((entry) => entry.confirmed)
}

/**
 * The single date the countdown runs against.
 * `source: 'window'` means no module date is known and the number is a
 * placeholder against the window start; consumers must label it as such.
 */
export function resolveExamTarget({ moduleExamDates = {}, schedule = {}, referenceDate = '' } = {}) {
  const { start, end } = examWindow(schedule)
  const confirmed = confirmedExamDates(moduleExamDates, schedule).sort((a, b) =>
    a.date.localeCompare(b.date),
  )

  if (confirmed.length > 0) {
    const next = confirmed.find((entry) => entry.date >= referenceDate) ?? confirmed[0]
    return {
      source: 'module',
      status: 'confirmed',
      confirmed: true,
      moduleId: next.moduleId,
      label: next.label,
      date: next.date,
      windowStart: start,
      windowEnd: end,
      confirmedCount: confirmed.length,
      moduleCount: EXAM_MODULES.length,
    }
  }

  return {
    source: 'window',
    status: 'unconfirmed',
    confirmed: false,
    moduleId: null,
    label: 'exam window',
    date: start,
    windowStart: start,
    windowEnd: end,
    confirmedCount: 0,
    moduleCount: EXAM_MODULES.length,
  }
}

export function examCountdownDays(targetDate, referenceDate) {
  if (!isIsoDay(targetDate) || !isIsoDay(referenceDate)) return null
  const from = new Date(`${referenceDate}T00:00:00Z`)
  const to = new Date(`${targetDate}T00:00:00Z`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return Math.round((to - from) / 86400000)
}

/**
 * Apply a validated change to the stored map, dropping cleared keys entirely so
 * that an absent key and an empty string can never mean different things.
 */
export function applyModuleExamDate(moduleExamDates = {}, moduleId, date) {
  const next = { ...moduleExamDates }
  if (!date) delete next[moduleId]
  else next[moduleId] = date
  return next
}
