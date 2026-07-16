// Weekly life-admin and health cards, generated from the structure of the week
// rather than hand-authored one-offs. Titles embed the week-commencing label so
// seeding is idempotent: a card is only added when no card with the same title
// exists yet. Inputs match the AddCardDialog shape consumed by buildCustomCard.

import { addDays, formatDate } from './progress.js'

export function weekLabel(weekStart) {
  const day = new Date(`${weekStart}T12:00:00`).getDay()
  return `${day === 1 ? 'w/c' : 'from'} ${formatDate(weekStart)}`
}

export function buildWeeklyLifeCardInputs(weekStart) {
  const label = weekLabel(weekStart)
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
  }

  return [
    {
      ...base,
      title: `LIFE — Groceries + supermarket run (${label})`,
      module: 'General',
      dueDate: groceriesDue,
      estimatedHours: '1',
      description: 'One planned supermarket trip including travel there and back; restock the week in one pass.',
      doneCondition: 'Fridge and shelf stocked for the week; no midweek emergency runs needed.',
      tags: 'recovery',
    },
    {
      ...base,
      title: `LIFE — Laundry + room reset (${label})`,
      module: 'General',
      dueDate: weekEnd,
      estimatedHours: '1',
      description: 'Laundry cycle plus a 20-minute desk and room reset so Monday starts clean.',
      doneCondition: 'Clean clothes ready and desk cleared for the new week.',
      tags: 'recovery',
    },
    {
      ...base,
      title: `LIFE — Admin hour: email, forms, bills (${label})`,
      module: 'Admin',
      dueDate: weekStart,
      estimatedHours: '1',
      description: 'One bounded hour for inbox, university forms, bills, and any date-watch items.',
      doneCondition: 'Inbox triaged and no unanswered administrative deadline this week.',
      tags: 'admin',
    },
    {
      ...base,
      title: `HEALTH — Three movement breaks (${label})`,
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
