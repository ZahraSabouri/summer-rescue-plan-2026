import { isOverdue, localDateString, sortCards, toDate } from './progress.js'

const DECIDED_STATUSES = new Set(['Rescue Lane', 'Waiting / Blocked'])

export function getRescueTriageCards(cards, referenceDate) {
  const seen = new Set()

  return sortCards(
    (cards ?? []).filter((card) => {
      if (
        !card?.id ||
        seen.has(card.id) ||
        DECIDED_STATUSES.has(card.status) ||
        !isOverdue(card, referenceDate)
      ) {
        return false
      }
      seen.add(card.id)
      return true
    }),
  )
}

export function isValidTriageDate(dateString, referenceDate) {
  const date = toDate(dateString)
  if (!date || localDateString(date) !== dateString) return false
  return Boolean(referenceDate && dateString >= referenceDate)
}
