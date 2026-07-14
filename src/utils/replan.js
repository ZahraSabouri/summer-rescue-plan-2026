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

// Pack outstanding exam cards into a realistic forward schedule: highest priority
// (then earliest original date) first, filling `dailyHours` per day from today.
// Each card's new due date is the day its work finishes; anything landing past the
// readiness date is flagged `stretch` (beyond capacity — do only if time allows).
export function computeReplanSchedule(cards, options = {}) {
  const {
    referenceDate,
    dailyHours = 8,
    readiness = READINESS_DATE,
    examGroups = EXAM_GROUPS,
  } = options

  const outstanding = cards.filter(
    (card) => isTrackableCard(card) && !card.done && examGroups.includes(card.moduleGroup),
  )
  const sorted = [...outstanding].sort((a, b) => {
    const rank = (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4)
    if (rank !== 0) return rank
    const da = a.dueDate || a.startDate || '9999-12-31'
    const db = b.dueDate || b.startDate || '9999-12-31'
    if (da !== db) return da.localeCompare(db)
    return Number(a.number ?? 9999) - Number(b.number ?? 9999)
  })

  const perDay = Math.max(1, dailyHours)
  let cumulative = 0
  let overflow = 0
  const assignments = sorted.map((card) => {
    const hours = Math.max(0.5, Number(card.estimatedHours ?? card.hours ?? 0))
    cumulative += hours
    const dayIndex = Math.max(0, Math.ceil(cumulative / perDay) - 1)
    const dueDate = addDays(referenceDate, dayIndex)
    const stretch = dueDate > readiness
    if (stretch) overflow += 1
    return { cardId: card.id, dueDate, stretch }
  })

  return {
    assignments,
    count: assignments.length,
    overflow,
    lastDay: assignments.length ? assignments[assignments.length - 1].dueDate : referenceDate,
  }
}
