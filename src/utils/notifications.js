import { addDays, formatDate, getCardDate, isOverdue, localDateString, toDate } from './progress.js'

const EXAM_THRESHOLDS = new Set([45, 30, 21, 14, 7, 3, 1])

function dateDiff(fromISO, toISO) {
  const from = toDate(fromISO)
  const to = toDate(toISO)
  if (!from || !to) return null
  return Math.round((to - from) / 86400000)
}

function isoDate(value) {
  if (!value) return ''
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? text.slice(0, 10) : localDateString(date)
}

function latestBlockedStart(card, fallbackDate) {
  const move = (card.activity ?? []).find(
    (entry) => entry.action === 'Moved card' && entry.details === 'Waiting / Blocked',
  )
  return isoDate(move?.at || card.updatedAt || card.startDate || card.dueDate || fallbackDate)
}

function notification(record) {
  return {
    createdAt: record.createdAt,
    read: false,
    ...record,
  }
}

export function generateNotifications({
  cards,
  referenceDate,
  examCountdown,
  examConfirmed = false,
  examLabel = 'exams',
  unsavedSinceBackup,
  lastBackupAt,
  mat700Active,
  campaignStart,
  createdAt,
}) {
  const records = []

  for (const card of cards) {
    if (card.done) continue

    const cardDate = getCardDate(card)
    if (cardDate) {
      const daysUntil = dateDiff(referenceDate, cardDate)
      const daysLate = dateDiff(cardDate, referenceDate)

      if (daysUntil === 1) {
        records.push(
          notification({
            id: `${card.id}:due-tomorrow:${referenceDate}`,
            cardId: card.id,
            rule: 'due-tomorrow',
            type: 'warning',
            title: `Due tomorrow · ${formatDate(cardDate)}`,
            detail: card.title,
            createdAt: referenceDate,
          }),
        )
      }

      if (daysUntil === 0) {
        records.push(
          notification({
            id: `${card.id}:due-today:${referenceDate}`,
            cardId: card.id,
            rule: 'due-today',
            type: 'warning',
            title: `Due today · ${formatDate(cardDate)}`,
            detail: card.title,
            createdAt: referenceDate,
          }),
        )
      }

      if (daysLate != null && daysLate >= 1 && daysLate % 2 === 1 && isOverdue(card, referenceDate)) {
        records.push(
          notification({
            id: `${card.id}:overdue:${referenceDate}`,
            cardId: card.id,
            rule: 'overdue',
            type: 'danger',
            title: `${daysLate} day${daysLate === 1 ? '' : 's'} overdue`,
            detail: `${card.title} was due ${formatDate(cardDate)}.`,
            createdAt: referenceDate,
          }),
        )
      }
    }

    if (card.status === 'Waiting / Blocked') {
      const since = latestBlockedStart(card, campaignStart || referenceDate)
      const daysBlocked = dateDiff(since, referenceDate)
      const thresholdDate = addDays(since, 2)
      if (daysBlocked != null && daysBlocked >= 2) {
        records.push(
          notification({
            id: `${card.id}:blocked:${thresholdDate}`,
            cardId: card.id,
            rule: 'blocked',
            type: 'info',
            title: 'Blocked for 2+ days',
            detail: card.title,
            createdAt: thresholdDate,
          }),
        )
      }
    }
  }

  if (examCountdown != null && EXAM_THRESHOLDS.has(examCountdown)) {
    records.push(
      notification({
        id: `exam:t-${examCountdown}`,
        rule: 'exam-countdown',
        type: examCountdown <= 14 ? 'danger' : 'info',
        // Without a confirmed personal date the count is to the window opening,
        // not to a sitting. Saying "exams" would imply a date nobody has given us.
        title: examConfirmed
          ? `${examCountdown} days to ${examLabel}`
          : `${examCountdown} days to the exam window`,
        detail: examConfirmed
          ? 'Keep the high-yield lanes moving.'
          : 'Module dates are still unconfirmed — add them in Settings once Cardiff publishes them.',
        createdAt: referenceDate,
      }),
    )
  }

  if (examCountdown === 0) {
    records.push(
      notification({
        id: 'exam:t-0',
        rule: 'exam-countdown',
        type: 'danger',
        title: examConfirmed ? `${examLabel} exam today` : 'Exam window opens today',
        detail: 'Use warm-up plans only; no new material.',
        createdAt: referenceDate,
      }),
    )
  }

  if (unsavedSinceBackup) {
    const staleFrom = isoDate(lastBackupAt || createdAt)
    const staleDays = staleFrom ? dateDiff(staleFrom, referenceDate) : null
    if (staleDays == null || staleDays >= 1) {
      records.push(
        notification({
          id: `backup-stale:${referenceDate}`,
          rule: 'backup-stale',
          type: 'warning',
          title: 'File backup is stale',
          detail: 'Use Save to refresh the portable JSON copy.',
          createdAt: referenceDate,
        }),
      )
    }
  }

  if (!mat700Active) {
    records.push(
      notification({
        id: 'mat700-paused',
        rule: 'mat700-paused',
        type: 'info',
        title: 'Data Mining lane is paused',
        detail: 'Turn it on in Settings if this study lane is still needed.',
        createdAt: referenceDate,
      }),
    )
  }

  return records
}
