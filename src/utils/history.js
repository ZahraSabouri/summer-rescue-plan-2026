// History / progression engine.
// Two honest data sources, no fabrication:
//  1) doneTimeline  - reconstructed from the timestamped activity log, so the
//     cumulative "cards completed" curve is accurate even retroactively.
//  2) snapshots     - a once-per-day aggregate recorded into localStorage, used
//     for the logged-hours curve (which the activity log can't reconstruct
//     precisely). Builds real day-by-day history as the campaign runs.

import { addDays, isTrackableCard, localDateString, startOfWeek, toDate } from './progress.js'

export const CAMPAIGN_START = '2026-07-04'
export const CAMPAIGN_END = '2026-08-18'
export const EXAM_WINDOW_START = '2026-08-17'
export const DEFAULT_SCHEDULE = {
  campaignStart: CAMPAIGN_START,
  campaignEnd: CAMPAIGN_END,
  examWindowStart: EXAM_WINDOW_START,
}

function isoDay(value) {
  if (!value) return null
  const text = String(value)
  const day = text.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return day
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? day : localDateString(date)
}

function clampDay(day, min, max) {
  if (min && day < min) return min
  if (max && day > max) return max
  return day
}

function normaliseDay(value, fallback) {
  const day = isoDay(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : fallback
}

function round1(value) {
  return Math.round(value * 10) / 10
}

function maxDay(a, b) {
  return a > b ? a : b
}

function countDaysInclusive(startDay, endDay) {
  if (!startDay || !endDay || startDay > endDay) return 0
  return listDays(startDay, endDay).length
}

export function resolveSchedule(schedule = {}) {
  const campaignStart = normaliseDay(schedule.campaignStart, CAMPAIGN_START)
  const rawCampaignEnd = normaliseDay(schedule.campaignEnd, CAMPAIGN_END)
  const rawExamWindowStart = normaliseDay(schedule.examWindowStart, EXAM_WINDOW_START)

  return {
    campaignStart,
    campaignEnd: rawCampaignEnd < campaignStart ? campaignStart : rawCampaignEnd,
    examWindowStart: rawExamWindowStart < campaignStart ? campaignStart : rawExamWindowStart,
  }
}

// Earliest moment a card became "done", read from its activity log.
export function completionDay(card) {
  if (!card.done) return null
  const activity = card.activity ?? []
  // activity is stored newest-first; scan for the latest "became done" marker
  // but we want the *earliest* such event, so collect all and take the min.
  const doneEvents = activity.filter(
    (entry) =>
      entry.action === 'Marked done' ||
      (entry.action === 'Moved card' && entry.details === 'Done') ||
      (entry.action === 'Added card' && card.done),
  )
  if (doneEvents.length > 0) {
    const earliest = doneEvents.reduce((min, e) => (e.at < min ? e.at : min), doneEvents[0].at)
    return isoDay(earliest)
  }
  // Fallbacks: an update timestamp, else the card's due date.
  const fallback = card.updatedAt || card.dueDate || card.startDate
  return isoDay(fallback)
}

export function listDays(startDay, endDay) {
  const out = []
  let cursor = startDay
  let guard = 0
  while (cursor <= endDay && guard < 800) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
    guard += 1
  }
  return out
}

// Build the cumulative "cards completed" series across the campaign window,
// plus an ideal-pace reference line from start -> exam window.
export function buildBurnUp(cards, referenceDate, { plannedOnly = true, schedule } = {}) {
  const plan = resolveSchedule(schedule)
  const planned = plannedOnly ? cards.filter(isTrackableCard) : cards
  const total = planned.length || 1
  const referenceDay = isoDay(referenceDate) ?? plan.campaignStart

  const endDay = clampDay(
    referenceDay > plan.campaignEnd ? referenceDay : plan.campaignEnd,
    plan.campaignStart,
    '2026-12-31',
  )
  const days = listDays(plan.campaignStart, endDay)

  // count completions per day
  const perDay = {}
  for (const card of planned) {
    const day = completionDay(card)
    if (!day) continue
    const bounded = clampDay(day, plan.campaignStart, endDay)
    perDay[bounded] = (perDay[bounded] ?? 0) + 1
  }

  // ideal pace: 0 at start -> total at exam window start, flat after
  const startT = toDate(plan.campaignStart).getTime()
  const examT = toDate(plan.examWindowStart).getTime()
  const span = Math.max(1, examT - startT)

  let running = 0
  const today = isoDay(referenceDate)
  const series = days.map((day) => {
    running += perDay[day] ?? 0
    const t = toDate(day).getTime()
    const idealRaw = ((t - startT) / span) * total
    const ideal = Math.max(0, Math.min(total, idealRaw))
    return {
      day,
      done: running,
      ideal: Math.round(ideal * 10) / 10,
      isFuture: day > today,
    }
  })

  return { series, total, days }
}

// Aggregate a daily series into weekly or monthly buckets (uses the bucket's
// last in-range value for cumulative metrics).
export function bucketSeries(series, grain) {
  if (grain === 'day') return series
  const buckets = new Map()
  for (const point of series) {
    const d = toDate(point.day)
    let key
    let label
    if (grain === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      label = d.toLocaleDateString('en-GB', { month: 'short' })
    } else {
      // ISO-ish week key by Monday
      key = startOfWeek(point.day)
      label = toDate(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
    buckets.set(key, { ...point, label })
  }
  return [...buckets.values()]
}

// Logged-hours series derived from daily snapshots: cumulative + per-period.
export function buildHoursSeries(snapshots, grain = 'day') {
  const days = Object.keys(snapshots ?? {}).sort()
  if (days.length === 0) return { series: [], totalLogged: 0 }

  const raw = days.map((day) => ({
    day,
    cumulative: Number(snapshots[day]?.loggedHours ?? 0),
    done: Number(snapshots[day]?.done ?? 0),
  }))

  // per-day increment (logged that day) from cumulative diffs
  let prev = 0
  for (const point of raw) {
    point.logged = Math.max(0, Math.round((point.cumulative - prev) * 10) / 10)
    prev = point.cumulative
  }

  if (grain === 'day') {
    return { series: raw, totalLogged: prev }
  }

  const buckets = new Map()
  for (const point of raw) {
    const d = toDate(point.day)
    let key
    let label
    if (grain === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      label = d.toLocaleDateString('en-GB', { month: 'short' })
    } else {
      key = startOfWeek(point.day)
      label = toDate(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }

    const existing = buckets.get(key) ?? { day: key, label, logged: 0, cumulative: 0, done: 0 }
    existing.logged = Math.round((existing.logged + point.logged) * 10) / 10
    existing.cumulative = point.cumulative
    existing.done = point.done
    buckets.set(key, existing)
  }
  const bucketed = [...buckets.values()]
  return { series: bucketed, totalLogged: prev }
}

// Contribution-style heatmap: a value per day (cards completed that day).
export function buildActivityHeatmap(cards, referenceDate, { schedule } = {}) {
  const plan = resolveSchedule(schedule)
  const counts = {}
  for (const card of cards) {
    if (!card.done) continue
    const day = completionDay(card)
    if (!day) continue
    counts[day] = (counts[day] ?? 0) + 1
  }
  // also fold in any logged-hours activity timestamps for richer signal
  for (const card of cards) {
    for (const entry of card.activity ?? []) {
      if (entry.action === 'Logged hours') {
        const day = isoDay(entry.at)
        if (day) counts[day] = (counts[day] ?? 0) + 0 // keep day present, weight via done
      }
    }
  }
  const today = isoDay(referenceDate) ?? plan.campaignStart
  const end = today > plan.campaignEnd ? today : plan.campaignEnd
  const days = listDays(plan.campaignStart, end)
  return days.map((day) => ({ day, value: counts[day] ?? 0, isFuture: day > today }))
}

// Pace assessment vs the ideal line for the dashboard banner.
export function buildPace(cards, referenceDate, { schedule } = {}) {
  const plan = resolveSchedule(schedule)
  const { series, total } = buildBurnUp(cards, referenceDate, { schedule: plan })
  const planned = cards.filter(isTrackableCard)
  const today = isoDay(referenceDate) ?? plan.campaignStart
  const point =
    series.find((p) => p.day === today) ??
    series.filter((p) => p.day <= today).slice(-1)[0] ??
    series[0]
  if (!point) {
    return {
      done: 0,
      total,
      ideal: 0,
      delta: 0,
      linearOnTrack: true,
      onTrack: true,
      pctDone: 0,
      remaining: 0,
      studyDaysLeft: 0,
      requiredPerDay: 0,
      recentDone: 0,
      recentDays: 0,
      recentPerDay: 0,
    }
  }
  const remaining = Math.max(0, total - point.done)
  // Readiness work starts no earlier than the campaign and ends the day before
  // the assessment window. This keeps pre-launch days and the first exam day
  // out of the denominator used for the required daily pace.
  const readinessStart = maxDay(today, plan.campaignStart)
  const readinessEnd = addDays(plan.examWindowStart, -1)
  const studyDaysLeft = countDaysInclusive(readinessStart, readinessEnd)
  const requiredRaw = remaining / Math.max(1, studyDaysLeft)
  const recentStart = maxDay(plan.campaignStart, addDays(today, -6))
  const recentDays = Math.max(1, countDaysInclusive(recentStart, today))
  const recentDone = planned.filter((card) => {
    const day = completionDay(card)
    return day && day >= recentStart && day <= today
  }).length
  const recentRaw = recentDone / recentDays
  const delta = round1(point.done - point.ideal)
  const requiredOnTrack = remaining === 0 || recentRaw >= requiredRaw

  return {
    done: point.done,
    total,
    ideal: point.ideal,
    delta,
    linearOnTrack: delta >= -2,
    onTrack: requiredOnTrack,
    pctDone: Math.round((point.done / total) * 100),
    remaining,
    studyDaysLeft,
    requiredPerDay: round1(requiredRaw),
    recentDone,
    recentDays,
    recentPerDay: round1(recentRaw),
    daysToExam: Math.max(0, Math.round((toDate(plan.examWindowStart) - toDate(today)) / 86400000)),
  }
}
