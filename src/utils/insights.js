// Insights engine for the Today / Mission Control view.
// Pure functions only — no state, no fabrication. Everything is derived from
// the activity log, snapshots, and card fields that already exist.

import { addDays, getCardDate, isOverdue, isTrackableCard, localDateString, sumHours } from './progress.js'
import { completionDay, resolveSchedule } from './history.js'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

function isoDay(value) {
  if (!value) return null
  const text = String(value)
  const day = text.slice(0, 10)
  if (DAY_RE.test(text)) return day
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? (DAY_RE.test(day) ? day : null) : localDateString(date)
}

// ---------------------------------------------------------------------------
// Priority split guardrail mirrors the protected pre-exam timetable:
// 80h AML / 96h Time Series / 58h MAT700 (rounded to whole percentages).
// ---------------------------------------------------------------------------

export const SPLIT_TARGETS_FULL = {
  'Applied ML': 34,
  'Time Series': 41,
  MAT700: 25,
}

export const SPLIT_TARGETS_NO_MAT700 = {
  'Applied ML': 52,
  'Time Series': 48,
}

export const SPLIT_LABELS = {
  'Applied ML': 'Applied ML',
  'Time Series': 'Time Series',
  MAT700: 'Data Mining',
}

// Drift beyond this many percentage points (with enough hours logged to be
// meaningful) is flagged.
const DRIFT_TOLERANCE = 8
const MIN_MEANINGFUL_HOURS = 4

export function buildSplitGuardrail(cards, mat700Active = true) {
  const targets = mat700Active ? SPLIT_TARGETS_FULL : SPLIT_TARGETS_NO_MAT700
  const moduleGroups = Object.keys(targets)
  const tracked = cards.filter(
    (card) => isTrackableCard(card) && moduleGroups.includes(card.moduleGroup),
  )
  const totalHours = sumHours(tracked, 'actualHours')

  const rows = moduleGroups.map((group) => {
    const groupCards = tracked.filter((card) => card.moduleGroup === group)
    const hours = sumHours(groupCards, 'actualHours')
    const actualPct = totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0
    const targetPct = targets[group]
    const drift = actualPct - targetPct
    return {
      group,
      label: SPLIT_LABELS[group] ?? group,
      hours: Math.round(hours * 10) / 10,
      actualPct,
      targetPct,
      drift,
      status:
        totalHours < MIN_MEANINGFUL_HOURS
          ? 'warming-up'
          : drift <= -DRIFT_TOLERANCE
            ? 'under'
            : drift >= DRIFT_TOLERANCE
              ? 'over'
              : 'on-target',
    }
  })

  const meaningful = totalHours >= MIN_MEANINGFUL_HOURS
  const worst = meaningful
    ? rows.reduce((acc, row) => (Math.abs(row.drift) > Math.abs(acc?.drift ?? 0) ? row : acc), null)
    : null
  const alert =
    worst && Math.abs(worst.drift) >= DRIFT_TOLERANCE
      ? worst.drift < 0
        ? `${worst.label} is ${Math.abs(worst.drift)} pts under its ${worst.targetPct}% target — steer hours back to it.`
        : `${worst.label} is ${worst.drift} pts over its ${worst.targetPct}% target — other modules are being starved.`
      : null

  return { rows, totalHours: Math.round(totalHours * 10) / 10, meaningful, alert }
}

// Per-module hours deficit in percentage points (positive = module is behind
// its target share). Used to bias the daily card picks.
export function splitDeficits(cards, mat700Active = true) {
  const { rows, meaningful } = buildSplitGuardrail(cards, mat700Active)
  const deficits = {}
  for (const row of rows) {
    deficits[row.group] = meaningful ? Math.max(0, -row.drift) : 0
  }
  return deficits
}

// ---------------------------------------------------------------------------
// Daily focus picks — the three cards most worth doing right now.
// ---------------------------------------------------------------------------

const PRIORITY_SCORE = { Critical: 90, High: 60, Medium: 30, Low: 10 }
const STATUS_SCORE = { Today: 80, 'Rescue Lane': 50, 'This Week': 30, 'Deep Work': 25 }

export function scoreCard(card, referenceDate, deficits = {}) {
  let score = 0
  const cardDate = getCardDate(card)

  if (isOverdue(card, referenceDate)) {
    const daysOver = Math.min(
      14,
      Math.max(1, Math.round((Date.parse(referenceDate) - Date.parse(card.dueDate)) / 86400000)),
    )
    score += 400 + daysOver * 5
  } else if (cardDate === referenceDate) {
    score += 300
  } else if (cardDate && cardDate <= addDays(referenceDate, 3)) {
    score += 200
  } else if (cardDate && cardDate <= addDays(referenceDate, 7)) {
    score += 100
  }

  score += PRIORITY_SCORE[card.priority] ?? 0
  score += STATUS_SCORE[card.status] ?? 0
  score += (deficits[card.moduleGroup] ?? 0) * 4

  return score
}

export function buildTodayPicks(cards, referenceDate, mat700Active = true, count = 3) {
  const deficits = splitDeficits(cards, mat700Active)
  const candidates = cards.filter(
    (card) =>
      isTrackableCard(card) &&
      !card.done &&
      card.status !== 'Waiting / Blocked' &&
      (mat700Active || card.moduleGroup !== 'MAT700'),
  )

  const scored = candidates
    .map((card) => ({ card, score: scoreCard(card, referenceDate, deficits) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const picks = []
  const usedModules = new Map()
  // Light diversity rule: avoid all picks landing on one module unless the
  // queue leaves no other option.
  for (const item of scored) {
    const moduleCount = usedModules.get(item.card.moduleGroup) ?? 0
    if (moduleCount >= 2 && scored.length > count) continue
    picks.push(item)
    usedModules.set(item.card.moduleGroup, moduleCount + 1)
    if (picks.length >= count) break
  }
  // Backfill if the diversity rule left gaps.
  for (const item of scored) {
    if (picks.length >= count) break
    if (!picks.includes(item)) picks.push(item)
  }

  const queue = scored.filter((item) => !picks.includes(item)).slice(0, 6)
  return { picks, queue, deficits }
}

export function pickReason(card, referenceDate, deficits = {}) {
  if (isOverdue(card, referenceDate)) return 'Overdue — clear it first'
  const cardDate = getCardDate(card)
  if (cardDate === referenceDate) return 'Due today'
  if (cardDate && cardDate <= addDays(referenceDate, 3)) return 'Due in the next 3 days'
  if ((deficits[card.moduleGroup] ?? 0) >= DRIFT_TOLERANCE)
    return `${SPLIT_LABELS[card.moduleGroup] ?? card.moduleGroup} is behind its target split`
  if (card.priority === 'Critical') return 'Critical priority'
  if (card.status === 'Today') return 'Planned for today'
  return 'Next best use of an hour'
}

// ---------------------------------------------------------------------------
// Catch-up backlog — overdue, unfinished work grouped by module so nothing from
// yesterday or the past week silently falls behind today's plan.
// ---------------------------------------------------------------------------

export function daysLate(card, referenceDate) {
  if (!card.dueDate) return 0
  return Math.max(0, Math.round((Date.parse(referenceDate) - Date.parse(card.dueDate)) / 86400000))
}

// A card that counts as "behind": a planned card (not a resource row), not done,
// and past its due date. Waiting/Blocked cards remain behind until their date is
// deliberately changed; excluding them made Today disagree with Table.
export function isActionableOverdue(card, referenceDate) {
  return (
    isTrackableCard(card) &&
    !card.done &&
    isOverdue(card, referenceDate)
  )
}

export function buildCatchUp(cards, referenceDate, mat700Active = true) {
  const behind = (cards ?? [])
    .filter(
      (card) =>
        isActionableOverdue(card, referenceDate) &&
        (mat700Active || card.moduleGroup !== 'MAT700'),
    )
    .map((card) => ({ card, dueDate: card.dueDate, daysLate: Math.max(1, daysLate(card, referenceDate)) }))

  const groupsMap = new Map()
  for (const item of behind) {
    const key = item.card.moduleGroup ?? 'Other'
    if (!groupsMap.has(key)) groupsMap.set(key, [])
    groupsMap.get(key).push(item)
  }

  const groups = [...groupsMap.entries()]
    .map(([group, items]) => {
      const sorted = items.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate) || b.daysLate - a.daysLate)
      return {
        group,
        label: sorted[0].card.module || SPLIT_LABELS[group] || group,
        items: sorted,
        count: sorted.length,
        maxDaysLate: Math.max(...sorted.map((entry) => entry.daysLate)),
        oldestDue: sorted[0].dueDate,
        hoursBehind: Math.round(sumHours(sorted.map((entry) => entry.card), 'estimatedHours') * 10) / 10,
      }
    })
    .sort((a, b) => a.oldestDue.localeCompare(b.oldestDue) || b.count - a.count)

  const buckets = { yesterday: 0, week: 0, older: 0 }
  for (const item of behind) {
    if (item.daysLate <= 1) buckets.yesterday += 1
    else if (item.daysLate <= 7) buckets.week += 1
    else buckets.older += 1
  }

  return {
    total: behind.length,
    moduleCount: groups.length,
    groups,
    buckets,
    behindModules: new Set(groups.map((group) => group.group)),
  }
}

// ---------------------------------------------------------------------------
// Day wrap-up — what actually happened today.
// ---------------------------------------------------------------------------

export function buildDaySummary(cards, snapshots, referenceDate) {
  const today = isoDay(referenceDate)
  const doneToday = cards.filter((card) => card.done && completionDay(card) === today)

  let hoursToday = 0
  const days = Object.keys(snapshots ?? {}).sort()
  const todayIndex = days.indexOf(today)
  if (todayIndex >= 0) {
    const nowHours = Number(snapshots[today]?.loggedHours ?? 0)
    const prevDay = days[todayIndex - 1]
    const prevHours = prevDay ? Number(snapshots[prevDay]?.loggedHours ?? 0) : 0
    hoursToday = Math.max(0, Math.round((nowHours - prevHours) * 10) / 10)
  }

  let focusSessionsToday = 0
  let focusMinutesToday = 0
  for (const card of cards) {
    for (const session of card.focusSessions ?? []) {
      if (isoDay(session.at) === today) {
        focusSessionsToday += 1
        focusMinutesToday += Number(session.minutes ?? 0)
      }
    }
  }

  return { doneToday, hoursToday, focusSessionsToday, focusMinutesToday }
}

// ---------------------------------------------------------------------------
// Study streak — consecutive days with real study activity: a completed card,
// a logged focus session, or hours logged (a snapshot with more hours/done than
// the day before). One missed day is forgiven so a single slip doesn't erase
// the run (a gentle "grace day", not a punishing chain). Purely derived — the
// same honest sources the rest of this engine uses; nothing is fabricated.
//
// The streak is a *campaign* metric, so it starts at campaignStart. Activity
// from an abandoned pre-reset plan is history, not part of this run: counting
// it would report a multi-day streak (and a spent grace day) on day one, before
// the user has had a chance to miss anything.
// ---------------------------------------------------------------------------

export function buildStudyStreak(cards, snapshots, referenceDate, { schedule } = {}) {
  const plan = resolveSchedule(schedule)
  const today = isoDay(referenceDate)
  const empty = {
    current: 0,
    studiedToday: false,
    graceUsed: false,
    graceAvailable: true,
    totalDays: 0,
    lastStudyDay: null,
  }
  if (!today) return empty

  const inCampaign = (day) => Boolean(day) && day >= plan.campaignStart

  // Collect every calendar day that shows genuine study activity.
  const studyDays = new Set()
  for (const card of cards ?? []) {
    for (const session of card.focusSessions ?? []) {
      const day = isoDay(session.at)
      if (inCampaign(day)) studyDays.add(day)
    }
    if (card.done) {
      const day = completionDay(card)
      if (inCampaign(day)) studyDays.add(day)
    }
  }
  // Snapshots are cumulative, so a day counts when its logged hours or done
  // count rose above the previous recorded day. The rise is measured against
  // the full series — including pre-campaign days — so the first campaign day
  // is compared with its true baseline rather than absorbing every earlier
  // hour; only the resulting day is then required to be in the campaign.
  const snapDays = Object.keys(snapshots ?? {}).sort()
  for (let index = 0; index < snapDays.length; index += 1) {
    const day = snapDays[index]
    const prevDay = index > 0 ? snapDays[index - 1] : null
    const hours = Number(snapshots[day]?.loggedHours ?? 0)
    const prevHours = prevDay ? Number(snapshots[prevDay]?.loggedHours ?? 0) : 0
    const done = Number(snapshots[day]?.done ?? 0)
    const prevDone = prevDay ? Number(snapshots[prevDay]?.done ?? 0) : 0
    if (!inCampaign(day)) continue
    if (hours - prevHours > 0.001 || done - prevDone > 0) studyDays.add(day)
  }

  if (studyDays.size === 0) return empty

  const studiedToday = studyDays.has(today)
  // An unstudied "today" is still in progress, so it never breaks the streak —
  // start counting from yesterday in that case.
  let cursor = studiedToday ? today : addDays(today, -1)
  let current = 0
  let graceUsed = false

  // The walk stops at campaignStart: there is no day before it to count, and
  // grace must not bridge backwards across the reset either.
  while (cursor && cursor >= plan.campaignStart) {
    if (studyDays.has(cursor)) {
      current += 1
      cursor = addDays(cursor, -1)
      continue
    }
    // Non-study day: spend the single grace day only to bridge to a real study
    // day behind it, so grace can never inflate a run out of thin air.
    const prior = addDays(cursor, -1)
    if (!graceUsed && inCampaign(prior) && studyDays.has(prior)) {
      graceUsed = true
      cursor = prior
      continue
    }
    break
  }

  return {
    current,
    studiedToday,
    graceUsed,
    graceAvailable: !graceUsed,
    totalDays: studyDays.size,
    lastStudyDay: [...studyDays].sort().at(-1) ?? null,
  }
}
