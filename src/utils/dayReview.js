// Pure day-review engine: for any past date, join the planned timetable (expanded
// schedule blocks), the retro-log (dayLog check-offs), and what verifiably
// happened (cards completed that day, focus sessions logged that day). Nothing is
// fabricated — retro-logged blocks record the day, they never create study hours.

import { completionDay } from './history.js'
import { addDays, cardsDueOn } from './progress.js'

const FIXED_EXAM_MODULES = new Set(['Applied ML', 'Time Series', 'MAT700'])
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

function isoDay(value) {
  if (!value) return null
  return String(value).slice(0, 10)
}

// Stable per-day key for a block: rule ids can repeat if a rule emits multiple
// blocks in one day, so the start time disambiguates.
export function blockLogKey(block) {
  if (block?.scheduleLogKey) return String(block.scheduleLogKey)
  return `${block?.id ?? 'block'}@${block?.start ?? ''}`
}

// Only the exam spine, confirmed teaching, and sleep have immovable times.
// `protected` intentionally does not imply fixed: admin, project, travel,
// meals, recovery and the rest of daily life remain movable.
export function isFixedScheduleBlock(block) {
  return Boolean(
    block?.category === 'sleep' ||
    block?.category === 'class' ||
    FIXED_EXAM_MODULES.has(block?.moduleGroup),
  )
}

export function applyBlockTimeOverride(block, detail = {}) {
  if (!block || typeof block !== 'object') return block
  const scheduleLogKey = blockLogKey(block)
  const originalStart = block.originalStart ?? block.start
  const originalEnd = block.originalEnd ?? block.end
  const fixed = isFixedScheduleBlock(block)
  const scheduledStart = !fixed && CLOCK.test(String(detail?.scheduledStart ?? ''))
    ? String(detail.scheduledStart)
    : originalStart
  const scheduledEnd = !fixed && CLOCK.test(String(detail?.scheduledEnd ?? ''))
    ? String(detail.scheduledEnd)
    : originalEnd
  return {
    ...block,
    scheduleLogKey,
    originalStart,
    originalEnd,
    start: scheduledStart,
    end: scheduledEnd,
    timeAdjusted: scheduledStart !== originalStart || scheduledEnd !== originalEnd,
  }
}

export function cardReviewLogKey(card) {
  return `card:${card?.id ?? 'unknown'}`
}

// The history strip contains completed calendar days. Today remains available
// through the explicit Today shortcut without displacing yesterday from the
// seven-day history.
export function previousReviewDates(referenceDate, count = 7) {
  const total = Math.max(0, Math.floor(Number(count) || 0))
  return Array.from({ length: total }, (_, index) => addDays(referenceDate, index - total))
}

export function buildDayReview({ date, blocks = [], cards = [], log = { days: {} } }) {
  const day = isoDay(date)
  const logged = log.days?.[day]?.blocks ?? {}
  const blockDetails = log.days?.[day]?.blockDetails ?? {}
  const note = log.days?.[day]?.note ?? ''
  const facts = log.days?.[day]?.facts ?? {}

  const entries = [...blocks]
    .filter((block) => block?.start && block?.end)
    .map((block) => {
      const key = blockLogKey(block)
      const detail = blockDetails[key] ?? {}
      return {
        key,
        block: applyBlockTimeOverride(block, detail),
        status: logged[key] === 'done' || logged[key] === 'skipped' ? logged[key] : 'unlogged',
        detail,
      }
    })
    .sort((a, b) => String(a.block.start).localeCompare(String(b.block.start)))

  const done = entries.filter((entry) => entry.status === 'done').length
  const skipped = entries.filter((entry) => entry.status === 'skipped').length
  const unlogged = entries.length - done - skipped

  const cardsDone = cards.filter((card) => card.done && completionDay(card) === day)
  const cardReviewStatuses = Object.fromEntries(cards.map((card) => {
    const savedStatus = logged[cardReviewLogKey(card)]
    return [card.id, card.done ? 'done' : savedStatus === 'done' || savedStatus === 'skipped' ? savedStatus : 'unlogged']
  }))
  const dueCards = cardsDueOn(cards, day).map((card) => {
    return {
      ...card,
      reviewStatus: cardReviewStatuses[card.id],
    }
  })
  const dueCardsOpen = dueCards.filter((card) => !card.done)

  let focusMinutes = 0
  let focusSessions = 0
  for (const card of cards) {
    for (const session of card.focusSessions ?? []) {
      if (isoDay(session.at) !== day) continue
      focusSessions += 1
      focusMinutes += Number(session.minutes ?? 0)
    }
  }

  return {
    date: day,
    entries,
    note,
    facts,
    summary: {
      total: entries.length,
      done,
      skipped,
      unlogged,
      loggedPct: entries.length > 0 ? Math.round(((done + skipped) / entries.length) * 100) : 0,
    },
    cardsDone,
    dueCards,
    dueCardsOpen,
    cardReviewStatuses,
    focusMinutes,
    focusSessions,
  }
}
