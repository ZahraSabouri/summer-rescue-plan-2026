// Weekly life-admin and health cards, generated from the structure of the week
// rather than hand-authored one-offs. Recurrence identity is stored separately
// from the visible title so a planning-window date is never mistaken for the
// card's actual due date.

import { addDays, formatDate } from './progress.js'

export function weekLabel(weekStart) {
  const day = new Date(`${weekStart}T12:00:00`).getDay()
  return `${day === 1 ? 'w/c' : 'from'} ${formatDate(weekStart)}`
}

const LEGACY_WEEK_SUFFIX = /\s*\((?:w\/c|from)\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+[A-Z][a-z]{2}\)\s*$/i

export function cleanWeeklyLifeCardTitle(value) {
  return String(value ?? '').replace(LEGACY_WEEK_SUFFIX, '').trim()
}

export function weeklyLifeCardKey(kind, weekStart) {
  return `weekly-life:${kind}:${weekStart}`
}

export function recurringLifeCardIdentity(card) {
  if (card?.recurrenceKey) return card.recurrenceKey
  const weekStart = card?.planningWindowStart || card?.startDate
  if (!weekStart) return ''
  const title = cleanWeeklyLifeCardTitle(card?.title).toLowerCase()
  if (title.includes('groceries + supermarket run')) return weeklyLifeCardKey('groceries', weekStart)
  if (title.includes('laundry + room reset')) return weeklyLifeCardKey('laundry', weekStart)
  if (title.includes('admin hour: email, forms, bills')) return weeklyLifeCardKey('admin-hour', weekStart)
  if (title.includes('three movement breaks')) return weeklyLifeCardKey('movement', weekStart)
  return ''
}

export function buildWeeklyLifeCardInputs(weekStart) {
  const day = new Date(`${weekStart}T12:00:00`).getDay() || 7
  const daysToSunday = 7 - day
  const groceriesDue = addDays(weekStart, Math.max(0, daysToSunday - 1))
  const weekEnd = addDays(weekStart, daysToSunday)
  const base = {
    phase: 'Phase 0',
    status: 'This Week',
    priority: 'Low',
    slotType: 'Flex',
    slotLabel: 'Life',
    startDate: weekStart,
    checklist: '',
    evidenceRequirement: '',
    tags: '',
    planningWindowStart: weekStart,
    planningWindowEnd: weekEnd,
  }

  return [
    {
      ...base,
      title: 'LIFE — Groceries + supermarket run',
      recurrenceKey: weeklyLifeCardKey('groceries', weekStart),
      module: 'General',
      dueDate: groceriesDue,
      estimatedHours: '1',
      description: 'One planned supermarket trip including travel there and back; restock the week in one pass.',
      doneCondition: 'Fridge and shelf stocked for the week; no midweek emergency runs needed.',
      tags: 'recovery',
    },
    {
      ...base,
      title: 'LIFE — Laundry + room reset',
      recurrenceKey: weeklyLifeCardKey('laundry', weekStart),
      module: 'General',
      dueDate: weekEnd,
      estimatedHours: '1',
      description: 'Laundry cycle plus a 20-minute desk and room reset so Monday starts clean.',
      doneCondition: 'Clean clothes ready and desk cleared for the new week.',
      tags: 'recovery',
    },
    {
      ...base,
      title: 'LIFE — Admin hour: email, forms, bills',
      recurrenceKey: weeklyLifeCardKey('admin-hour', weekStart),
      module: 'Admin',
      dueDate: weekStart,
      estimatedHours: '1',
      description: 'One bounded hour for inbox, university forms, bills, and any date-watch items.',
      doneCondition: 'Inbox triaged and no unanswered administrative deadline this week.',
      tags: 'admin',
    },
    {
      ...base,
      title: 'HEALTH — Three movement breaks',
      recurrenceKey: weeklyLifeCardKey('movement', weekStart),
      module: 'Health',
      dueDate: weekEnd,
      estimatedHours: '1.5',
      description: 'Three deliberate movement sessions across the week — walk, stretch, or workout; intensity does not matter, showing up does.',
      checklist: 'Movement break 1\nMovement break 2\nMovement break 3',
      doneCondition: 'All three checklist items ticked by Sunday night.',
      tags: 'health,recovery',
    },
  ]
}
