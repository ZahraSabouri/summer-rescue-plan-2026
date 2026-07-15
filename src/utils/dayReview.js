// Pure day-review engine: for any past date, join the planned timetable (expanded
// schedule blocks), the retro-log (dayLog check-offs), and what verifiably
// happened (cards completed that day, focus sessions logged that day). Nothing is
// fabricated — retro-logged blocks record the day, they never create study hours.

import { completionDay } from './history.js'

function isoDay(value) {
  if (!value) return null
  return String(value).slice(0, 10)
}

// Stable per-day key for a block: rule ids can repeat if a rule emits multiple
// blocks in one day, so the start time disambiguates.
export function blockLogKey(block) {
  return `${block?.id ?? 'block'}@${block?.start ?? ''}`
}

export function buildDayReview({ date, blocks = [], cards = [], log = { days: {} } }) {
  const day = isoDay(date)
  const logged = log.days?.[day]?.blocks ?? {}
  const note = log.days?.[day]?.note ?? ''
  const facts = log.days?.[day]?.facts ?? {}

  const entries = [...blocks]
    .filter((block) => block?.start && block?.end)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
    .map((block) => {
      const key = blockLogKey(block)
      return {
        key,
        block,
        status: logged[key] === 'done' || logged[key] === 'skipped' ? logged[key] : 'unlogged',
      }
    })

  const done = entries.filter((entry) => entry.status === 'done').length
  const skipped = entries.filter((entry) => entry.status === 'skipped').length
  const unlogged = entries.length - done - skipped

  const cardsDone = cards.filter((card) => card.done && completionDay(card) === day)

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
    focusMinutes,
    focusSessions,
  }
}
