// Capacity-aware re-planning. The plan was built for 70+ days; with ~33 left and
// nothing done it is far over capacity, so this computes — honestly, from the live
// card data — how much has to compress to fit the days remaining at a chosen daily
// load, module by module. Pure and testable: no state, no fabrication.

import { addDays, isTrackableCard } from './progress.js'

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export const READINESS_DATE = '2026-08-16'
export const PROJECT_DEADLINE = '2026-08-06'
export const EXAM_GROUPS = ['Applied ML', 'Time Series', 'MAT700']

function hoursOf(list) {
  return Math.round(list.reduce((sum, card) => sum + Number(card.estimatedHours ?? card.hours ?? 0), 0) * 10) / 10
}

function daysBetween(from, to) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
}

export function buildReplan(cards, options = {}) {
  const {
    referenceDate,
    dailyHours = 8,
    projectHours = 40,
    readiness = READINESS_DATE,
    examGroups = EXAM_GROUPS,
  } = options

  const daysLeft = Math.max(1, daysBetween(referenceDate, readiness))
  const capacity = Math.round(daysLeft * dailyHours * 10) / 10

  const outstanding = cards.filter((card) => isTrackableCard(card) && !card.done)
  const examCards = outstanding.filter((card) => examGroups.includes(card.moduleGroup))
  const examHours = hoursOf(examCards)

  // The team project is deadline-locked (6 Aug); reserve the user's share off the top.
  const reservedProject = Math.max(0, projectHours)
  const studyCapacity = Math.max(0, Math.round((capacity - reservedProject) * 10) / 10)
  const ratio = examHours > 0 ? Math.min(1, studyCapacity / examHours) : 1

  const modules = examGroups
    .map((group) => {
      const groupCards = examCards.filter((card) => card.moduleGroup === group)
      const outstandingHours = hoursOf(groupCards)
      const target = Math.round(outstandingHours * ratio * 10) / 10
      return {
        group,
        cards: groupCards.length,
        outstanding: outstandingHours,
        target,
        cut: Math.round((outstandingHours - target) * 10) / 10,
        perDay: Math.round((target / daysLeft) * 10) / 10,
      }
    })
    .filter((module) => module.cards > 0)
    .sort((a, b) => b.outstanding - a.outstanding)

  return {
    daysLeft,
    dailyHours,
    capacity,
    reservedProject,
    studyCapacity,
    examHours,
    totalOutstanding: hoursOf(outstanding),
    ratio,
    compressionPct: Math.round((1 - ratio) * 100),
    fits: examHours <= studyCapacity,
    overBy: Math.max(0, Math.round((examHours - studyCapacity) * 10) / 10),
    modules,
  }
}

// Titles matching this are second-pass repeats of work another card already covers
// (every AML session has both a lab run AND a "timed re-run"). In a compressed
// 30-day rescue these are the first thing to trade away, so they are scheduled
// after everything else and usually land in the stretch zone.
const LOW_YIELD_RE = /timed re-run/i

// Build a per-date study-hours lookup from the protected timetable. Only blocks
// with category 'study' count — classes, travel, meals, and routines are busy time
// and never receive study cards. Memoised because the packer probes days repeatedly.
export function buildStudyCapacityLookup(expandForDate) {
  const cache = new Map()
  return (date) => {
    if (cache.has(date)) return cache.get(date)
    let minutes = 0
    for (const block of expandForDate(date) ?? []) {
      if (block?.category !== 'study') continue
      const [sh, sm] = String(block.start ?? '').split(':').map(Number)
      const [eh, em] = String(block.end ?? '').split(':').map(Number)
      if ([sh, sm, eh, em].some(Number.isNaN)) continue
      minutes += Math.max(0, eh * 60 + em - (sh * 60 + sm))
    }
    const hoursFree = Math.round((minutes / 60) * 10) / 10
    cache.set(date, hoursFree)
    return hoursFree
  }
}

// Pack outstanding exam cards into a realistic forward schedule: highest priority
// (then earliest original date) first, filling each day's genuinely free study
// hours from today. With `capacityForDate` the packer respects the protected
// timetable (skipping days occupied by classes, travel, or routines); otherwise it
// uses a flat `dailyHours`. Low-yield "timed re-run" repeats are deprioritised to
// the very end. Each card's new due date is the day its work finishes; anything
// past the readiness date is flagged `stretch` and demoted to Backlog status.
export function computeReplanSchedule(cards, options = {}) {
  const {
    referenceDate,
    dailyHours = 8,
    readiness = READINESS_DATE,
    examGroups = EXAM_GROUPS,
    capacityForDate = null,
    trimLowYield = true,
  } = options

  const outstanding = cards.filter(
    (card) => isTrackableCard(card) && !card.done && examGroups.includes(card.moduleGroup),
  )
  const byUrgency = (a, b) => {
    const rank = (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4)
    if (rank !== 0) return rank
    const da = a.dueDate || a.startDate || '9999-12-31'
    const db = b.dueDate || b.startDate || '9999-12-31'
    if (da !== db) return da.localeCompare(db)
    return Number(a.number ?? 9999) - Number(b.number ?? 9999)
  }
  const isLowYield = (card) => trimLowYield && LOW_YIELD_RE.test(card.title ?? '')
  const core = outstanding.filter((card) => !isLowYield(card)).sort(byUrgency)
  const lowYield = outstanding.filter(isLowYield).sort(byUrgency)
  const sorted = [...core, ...lowYield]

  // Day-walking packer. Days report their own free study hours (capped by the
  // user's sustainable dailyHours); zero-capacity days (travel, full class days)
  // are skipped. The horizon is bounded so a broken schedule can never spin.
  const HORIZON_DAYS = 240
  const capFor = (dayIndex) => {
    const date = addDays(referenceDate, dayIndex)
    const scheduled = capacityForDate ? capacityForDate(date) : dailyHours
    // Past readiness the timetable may be empty; fall back to flat hours so the
    // stretch zone still gets dates instead of piling onto one day.
    const base = capacityForDate && date > readiness && scheduled <= 0 ? dailyHours : scheduled
    return Math.max(0, Math.min(dailyHours, base))
  }

  let dayIndex = 0
  let usedToday = 0
  let overflow = 0
  let stretchHours = 0
  let packedHours = 0
  const assignments = sorted.map((card) => {
    const cardHours = Math.max(0.5, Number(card.estimatedHours ?? card.hours ?? 0))
    let remaining = cardHours
    while (remaining > 0 && dayIndex < HORIZON_DAYS) {
      const free = capFor(dayIndex) - usedToday
      if (free <= 0) {
        dayIndex += 1
        usedToday = 0
        continue
      }
      const spent = Math.min(free, remaining)
      usedToday += spent
      remaining -= spent
      if (remaining > 0) {
        dayIndex += 1
        usedToday = 0
      }
    }
    const dueDate = addDays(referenceDate, Math.min(dayIndex, HORIZON_DAYS))
    const stretch = dueDate > readiness
    if (stretch) {
      overflow += 1
      stretchHours += cardHours
    } else {
      packedHours += cardHours
    }
    return {
      cardId: card.id,
      dueDate,
      stretch,
      lowYield: isLowYield(card),
      status: stretch ? 'Backlog' : 'This Week',
    }
  })

  return {
    assignments,
    count: assignments.length,
    overflow,
    trimmed: lowYield.length,
    // Hours that fit before readiness vs the hours that spill past it — the
    // timetable-true version of buildReplan's flat "fits / over by" verdict.
    packedHours: Math.round(packedHours * 10) / 10,
    stretchHours: Math.round(stretchHours * 10) / 10,
    lastDay: assignments.length ? assignments[assignments.length - 1].dueDate : referenceDate,
  }
}
